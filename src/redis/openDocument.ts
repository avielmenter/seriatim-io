export type Permissions = "Read" | "ReadWrite";

export type RedisOpenDocument = {
    document_id?: string,
    permissions?: string,
    session_id?: string
}

export type OpenDocument = {
    documentID: string,
    permissions: Permissions,
    sessionID: string
}

export function parseOpenDocument(raw: RedisOpenDocument): OpenDocument | undefined {
    let documentID = raw.document_id;
    let permissions: Permissions = raw.permissions == "ReadWrite"
        ? "ReadWrite"
        : "Read";
    let sessionID = raw.session_id;;

    return sessionID === undefined || documentID == undefined
        ? undefined
        : { documentID, permissions, sessionID };
}