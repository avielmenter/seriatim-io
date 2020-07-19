import * as DotEnv from 'dotenv';
import * as SocketIO from 'socket.io';

import { closeDocument, connect, getSessionByID } from './redis';
import { OpenDocument } from './redis/openDocument';

import { Document } from './document';
import { Event, reducer } from './io/events';

import { HandshakeEvent, parseHandshake } from './serverEvents';
import { parseEvent } from './io/parse';

type ErrorCode
    = "DOCUMENT_UNOPENED"
    | "INSUFFICIENT_PERMISSIONS"
    | "INVALID_DATA"
    | "NOT_LOGGED_IN";

type Error = {
    code: ErrorCode,
    message: string
}

const send_error = (socket: SocketIO.Socket, error: any) => socket.emit(JSON.stringify({ status: "ERROR", error }));
const send_event = (socket: SocketIO.Socket, event: Event) => socket.emit(JSON.stringify({ status: "EVENT", event }));

const err = (code: ErrorCode, message: string): Error => ({ code, message });

DotEnv.config();

const redis = connect(process.env.REDIS_URL as string);
const io = SocketIO();

let Documents: { [key: string]: Document | undefined } = {};
let OpenDocuments: { [key: string]: OpenDocument | undefined } = {};

io.on('connection', socket => {
    const wrap = <T>(onEvent: () => void) => () => {
        try {
            onEvent();
        } catch (e) {
            send_error(socket, e);
        }
    }

    const wrapAndValidate =
        <T>(onEvent: (input: T) => void, parseInput: (raw: any) => T | undefined) =>
            (data: any) => {
                try {
                    const input = parseInput(data);
                    if (!input)
                        throw err("INVALID_DATA", "You did not send data to the server in the correct format.");

                    onEvent(input);
                } catch (e) {
                    send_error(socket, e);
                }
            };

    const onHandshake = async (handshakeEvent: HandshakeEvent) => {
        const handshake = handshakeEvent.data;

        const session = await getSessionByID(redis, handshake.sessionID);
        if (session === undefined)
            throw err("NOT_LOGGED_IN", "You are not logged in.");

        let od = session.openDocuments.get(handshake.documentID);
        if (od === undefined)
            throw err("DOCUMENT_UNOPENED", "Document was never opened.");

        OpenDocuments[socket.id] = od;

        let liveDocument = Documents[od.documentID] === undefined
            ? handshake.document
            : Documents[od.documentID] as Document;

        if (Documents[od.documentID] === undefined && od.permissions == "ReadWrite") {
            Documents[od.documentID] = handshake.document;
        }

        send_event(socket, { code: "UPDATE_ITEMS", data: liveDocument.items.valueSeq().toList() });
        socket.join(od.documentID);
    }

    const onEdit = async (event: Event) => {
        let od = OpenDocuments[socket.id];
        let doc = Documents[od?.documentID || ""];
        if (!od || !doc)
            throw err("DOCUMENT_UNOPENED", "You have not opened this documentt.");
        if (od.permissions != "ReadWrite")
            throw err("INSUFFICIENT_PERMISSIONS", "You do not have permission to edit this document.");

        send_event(socket.to(od.documentID), event);
        Documents[od.documentID] = reducer(doc, event);
    }

    const onDisconnect = async () => {
        let od = OpenDocuments[socket.id];
        let session = await getSessionByID(redis, od?.sessionID || "");

        if (!od || !session)
            return;

        OpenDocuments[socket.id] = undefined;
        await closeDocument(redis, session, od.documentID);
    }

    socket.on('handshake', wrapAndValidate(onHandshake, parseHandshake));
    socket.on('edit', wrapAndValidate(onEdit, parseEvent));
    socket.on('disconnect', wrap(onDisconnect));
});

io.listen(process.env.PORT || 2999);