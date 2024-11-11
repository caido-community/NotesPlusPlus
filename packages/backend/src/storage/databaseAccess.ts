import {SDK} from "caido:plugin";
import {Result} from "sqlite";
import * as fs from "fs"; fs

export async function saveNote(sdk: SDK, noteKey: string, noteText: string, noteName: string, project: string, parentId: number, isFolder: boolean): Promise<Result> {
    const db = await sdk.meta.db();
    const statement = await db.prepare(`INSERT INTO NOTES (id,isFolder,parentId,noteName,noteText,projectId) VALUES(?,?,?,?,?,?)`)
    const result  = await statement.run(noteKey, isFolder ? 1 : 0,parentId,noteName,noteText ,project);
    sdk.console.log(result)
    return result
}

export async function deleteNote(sdk: SDK, noteKey: string): Promise<Result> {
    const db = await sdk.meta.db();
    const statement = await db.prepare(`DELETE FROM NOTES WHERE id = ?`)
    const result  = await statement.run(noteKey);
    sdk.console.log(result)
    return result
}

export async function deleteFolderAndChildren(sdk: SDK, noteKey: string): Promise<Result> {
    const db = await sdk.meta.db();
    const statement = await db.prepare(`DELETE FROM NOTES WHERE (id = ?) OR (parentId = ?)`)
    const result  = await statement.run(noteKey,noteKey);
    sdk.console.log(result)
    return result
}

export async function editNoteName(sdk: SDK, noteKey: string, noteName: string): Promise<Result> {
    const db = await sdk.meta.db();
    const statement = await db.prepare(`UPDATE NOTES SET noteName = ? WHERE id = ?`)
    const result  = await statement.run(noteName,noteKey);
    sdk.console.log(result)
    return result
}

export async function editNoteText(sdk: SDK, noteKey: string, noteText: string, noteShortText: string): Promise<Result> {
    const db = await sdk.meta.db();
    const statement = await db.prepare(`UPDATE NOTES SET noteText = ?, noteShortText = ? WHERE id = ?`)
    const result  = await statement.run(noteText,noteShortText, noteKey);
    sdk.console.log(result)
    return result
}

export const fetchImage = (sdk: SDK, filePath: string) => {
    try {
        // Read the file contents
        const data = fs.readFileSync(filePath)
        sdk.console.log(`FETCHED image data at ${filePath}: data:${getMimeType(filePath)};base64,${data.toString("base64")} `)
        return `data:${getMimeType(filePath)};base64,${data.toString("base64")}`;
    } catch (error) {
        throw new Error(`Failed to create blob URL: ${error}`);
    }
}

export const getNotesByProject = async (sdk: SDK, project: string) => {
    sdk.console.log("Fetching notes for project: "+ project)
    const db = await sdk.meta.db();
    const statement = await db.prepare(`SELECT * FROM NOTES WHERE projectId = ? ORDER BY parentId`)
    const result = await statement.all(project)
    sdk.console.log(result)
    return result
}

export async function initProject(sdk: SDK) {

    sdk.console.log("init'ing DB for plugin");
    sdk.meta.db().then((db) => {
        db.exec(
            `CREATE TABLE IF NOT EXISTS NOTES 
                (
                    id TEXT PRIMARY KEY,
                    isFolder BOOLEAN,
                    parentId INTEGER,
                    noteName TEXT,
                    noteText TEXT, 
                    noteShortText TEXT,
                    projectId TEXT)
        `).then(() => {
            sdk.console.log("DONE WITH TABLE INIT")
        }).catch((err) => {
            sdk.console.error("EXEC ERROR: "+err)
        });
    }).catch((error) => {
        sdk.console.error("ERROR: "+error)
    })
}


const getMimeType = (filePath: string) => {
    const extension = filePath.split('.').pop().toLowerCase();
    switch (extension) {
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'gif': return 'image/gif';
        default: return 'application/octet-stream';
    }
}