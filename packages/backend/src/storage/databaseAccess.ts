import {SDK} from "caido:plugin";
import {Result} from "sqlite";

export async function saveNote(sdk: SDK, noteText: string, noteName: string, project: string, parentId: number, isFolder: boolean): Promise<Result> {
    const db = await sdk.meta.db();
    const statement = await db.prepare(`INSERT INTO NOTES (isFolder,parentId,noteName,noteText,projectId) VALUES(?,?,?,?,?)`)
    const result  = await statement.run(isFolder ? 1 : 0,parentId,noteName,noteText ,project);
    sdk.console.log(result)
    return result

}

export const getNotesByProject = async (sdk: SDK, project: string) => {
    sdk.console.log("Fetching notes for project: "+ project)
    const db = await sdk.meta.db();
    const statement = await db.prepare(`SELECT * FROM NOTES WHERE projectId = ?`)
    const result = await statement.all(project)
    sdk.console.log("RESULT: "+result)
    return result
}

export async function initProject(sdk: SDK) {

    sdk.console.log("init'ing DB for plugin");
    sdk.meta.db().then((db) => {
        db.exec(
            `CREATE TABLE IF NOT EXISTS NOTES 
                (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    isFolder BOOLEAN,
                    parentId INTEGER,
                    noteName TEXT,
                    noteText TEXT, 
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