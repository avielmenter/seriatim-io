import * as Redis from 'redis';
import { promisify } from 'util';

import { parseSession, RedisSession, Session } from './session';
import { tagDocumentID, tagSessionID, tagID, TaggedIDTypes, untag } from './taggedID';
import { OpenDocument } from './openDocument';

export interface RedisConnection {
    get: (arg1: string) => Promise<string | null>
    set: (arg1: string, arg2: string) => Promise<unknown>,
    smembers: (arg1: string) => Promise<string[] | null>,
    srem: (...args: string[]) => Promise<number>
}

export function connect(redisURL: string): RedisConnection {
    const client = Redis.createClient(redisURL);

    return {
        get: promisify(client.get).bind(client),
        set: promisify(client.set).bind(client),
        smembers: promisify(client.smembers).bind(client),
        srem: promisify(client.srem).bind(client)
    }
}

export async function getSessionByID(connection: RedisConnection, sessionID: string): Promise<Session | undefined> {
    const str = await connection.get(tagSessionID(sessionID));
    const raw = str ? JSON.parse(str) as RedisSession : undefined;

    return raw && parseSession(raw);
}

async function getSessionsByTaggedID(connection: RedisConnection, id: string, tag: TaggedIDTypes): Promise<Session[] | undefined> {
    const sessionIDs = await connection.smembers(tagID(id, tag));

    if (sessionIDs === null)
        return undefined;

    let sessions = await Promise.all(sessionIDs.map(sessionID => getSessionByID(connection, sessionID)));
    return sessions.filter((s): s is Session => s !== undefined);
}

export const getSessionsByDocumentID = async (connection: RedisConnection, documentID: string) => getSessionsByTaggedID(connection, documentID, "DocumentID");
export const getSessionsByUserID = async (connection: RedisConnection, userID: string) => getSessionsByTaggedID(connection, userID, "UserID");

export async function getOpenDocumentsByID(connection: RedisConnection, documentID: string): Promise<OpenDocument[] | undefined> {
    const sessions = await getSessionsByDocumentID(connection, documentID);
    if (sessions === undefined)
        return undefined;

    return sessions
        .map(s => s.openDocuments.get(untag(documentID)))
        .filter((d): d is OpenDocument => d !== undefined);
}

export async function updateSession(connection: RedisConnection, session: Session): Promise<Session | undefined> {
    await connection.set(tagSessionID(session.sessionID), JSON.stringify(session));
    return await getSessionByID(connection, session.sessionID);
}

export async function closeDocument(connection: RedisConnection, session: Session, documentID: string): Promise<Session | undefined> {
    let closed: Session = {
        ...session,
        openDocuments: session.openDocuments.remove(untag(documentID))
    };

    await connection.srem(tagDocumentID(documentID), tagSessionID(session.sessionID));
    return await updateSession(connection, closed);
}