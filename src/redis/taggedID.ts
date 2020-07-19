export type TaggedIDTypes = "DocumentID" | "SessionID" | "UserID";

export const tagID = (id: string, tag: TaggedIDTypes) => id.startsWith(tag + " ( ")
    ? id
    : tag + " ( " + id + " )";

export const untag = (id: string) => id.substr(
    id.indexOf(" ") + 1,
    "12345678-1234-1234-1234-123456789abc".length
);

export const tagDocumentID = (id: string) => tagID(id, "DocumentID");
export const tagSessionID = (id: string) => tagID(id, "SessionID");
export const tagUserID = (id: string) => tagID(id, "UserID");