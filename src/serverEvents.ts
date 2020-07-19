import { Document } from './io/document';

import { parseDocument } from './io/parse';

export type HandshakeEvent = {
    code: "HANDSHAKE",
    data: {
        sessionID: string,
        documentID: string,
        document: Document
    }
};

export function parseHandshake(raw: any): HandshakeEvent | undefined {
    const sessionID = raw.sessionID;
    const documentID = raw.documentID;
    const document = raw.document && parseDocument(raw.document);

    return typeof sessionID != "string" || typeof documentID != "string" || !document
        ? undefined
        : { code: "HANDSHAKE", data: { sessionID, documentID, document } };
}

type ServerEvent
    = HandshakeEvent;

function parseServerEvent(raw: any): ServerEvent | undefined {
    if (!raw)
        return undefined;

    switch (raw.code) {
        case "HANDSHAKE":
            return parseHandshake(raw?.data);
        default:
            return undefined;
    }
}