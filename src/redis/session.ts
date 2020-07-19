import { Map } from 'immutable';

import { parseDate, RedisDate } from './date';
import { OpenDocument, RedisOpenDocument, parseOpenDocument } from './openDocument';

export type RedisSession = {
    ip?: string,
    open_documents?: { [key: string]: RedisOpenDocument }
    session_id?: string,
    time_created?: RedisDate,
    time_last_login?: RedisDate,
    user_id?: string
}

export interface Session {
    ip: string,
    openDocuments: Map<string, OpenDocument>,
    sessionID: string,
    timeCreated?: Date,
    timeLastLogin?: Date,
    userID: string
}

function parseOpenDocuments(open_documents?: { [key: string]: RedisOpenDocument }): Map<string, OpenDocument> {
    if (open_documents === undefined)
        return Map<string, OpenDocument>();

    let pairs = Object.keys(open_documents)
        .map(k => ([k, parseOpenDocument(open_documents[k])]))
        .filter((d): d is [string, OpenDocument] => d[1] !== undefined);

    return Map<string, OpenDocument>(pairs);
}

export function parseSession(raw: RedisSession): Session | undefined {
    let ip = raw.ip || "";
    let openDocuments = parseOpenDocuments(raw.open_documents);
    let sessionID = raw.session_id;
    let timeCreated = raw.time_created && parseDate(raw.time_created);
    let timeLastLogin = raw.time_last_login && parseDate(raw.time_last_login);
    let userID = raw.user_id;

    if (!sessionID || !userID || !openDocuments)
        return undefined;

    return {
        ip,
        openDocuments,
        sessionID,
        timeCreated,
        timeLastLogin,
        userID
    }
}