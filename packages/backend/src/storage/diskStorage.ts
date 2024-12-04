import {SDK} from "caido:plugin";
import * as path from "path";
import * as fs from "fs";
import {homedir} from "os";
import {NoteNode} from "shared";
import {HostedFile} from "@caido/sdk-frontend/src/types";
import {readFile} from "fs/promises";
import { nanoid } from 'nanoid/non-secure'



export async function createRootNoteFolder(sdk: SDK) {
    sdk.projects.getCurrent().then((project) => {
        if(project) {
            sdk.console.log("Creating root note folder: "+fs.mkdirSync(path.join(homedir(),".CaidoNotesPlusPlus",project.getId()),{recursive: true}));
        } else {
            sdk.console.log("Creating root note folder: "+fs.mkdirSync(path.join(homedir(),".CaidoNotesPlusPlus"),{recursive: true}));
        }
    })
}

export async function getNotes(sdk: SDK, project: string): Promise<NoteNode[]> {
    const nodes = [];
    recurseDirectory(sdk,path.join(homedir(),".CaidoNotesPlusPlus",project),nodes,project,undefined)
    sdk.console.log("Notes: "+nodes);
    return nodes
}

export async function saveNoteNode(sdk: SDK, noteNode: NoteNode): Promise<void> {
    const notePath = buildNotePath(noteNode);
    sdk.console.log("noteNodePath: "+notePath);
    if (noteNode.isFolder) {
        fs.mkdirSync(notePath,{recursive: true})
    } else {
        fs.writeFileSync(notePath,noteNode.data);
    }

}


export async function deleteNoteOnDisk(sdk: SDK, noteNode: NoteNode): Promise<void> {
    const notePath = buildNotePath(noteNode);
    sdk.console.log("noteNodePath: "+notePath);
    fs.rmSync(notePath,{recursive: true});
}

export async function renameNoteOnDisk(sdk: SDK, noteNode: NoteNode, newName: string): Promise<void> {
    const notePath = buildNotePath(noteNode);
    sdk.console.log("noteNodePath: "+notePath);
    fs.rmSync(notePath,{recursive: false})

    if (noteNode.isFolder) {
        fs.mkdirSync(path.join(path.parse(notePath).dir,newName),{recursive: false})
    } else {
        fs.writeFileSync(path.join(path.parse(notePath).dir,newName),noteNode.data);
    }

}

export const fetchImage = async (sdk: SDK, file: HostedFile) => {
    try {
        const data = await readFile(file.path);
        const dataUrl =`data:${getMimeType(file.name)};base64,${data.toString("base64")}`

        sdk.console.log(`FETCHED image data at ${file.path}: ${dataUrl}`)
        return dataUrl;
    } catch (error) {
        sdk.console.error("ERROR WITH IMAGE FETCH: "+error)
        throw new Error(`Failed to create blob URL: ${error}`);
    }
}

function recurseDirectory(sdk: SDK, filepath:string, nodes: NoteNode[], project:string, node: NoteNode) {
    sdk.console.log("Reading dir: "+filepath)
    fs.readdirSync(filepath).forEach(file => {
        const absolutePath = path.join(filepath, file);
        sdk.console.log("Reading sub dir: "+absolutePath);
        if( fs.statSync(absolutePath).isDirectory() ) {
            const noteNode = new NoteNode(nanoid(),"",file,"pi pi-fw pi-folder",false,project,true)
            if(node) {
                noteNode.filepath = [...node.filepath,file];
                node.children.push(noteNode)
            }else {
                noteNode.filepath = [file]
                nodes.push(noteNode)
            }
            return recurseDirectory(sdk,absolutePath,nodes,project,noteNode)
        } else {
            const fileData = fs.readFileSync(absolutePath)
            const noteNode = new NoteNode(nanoid(),fileData.toString(),file,"pi pi-fw pi-file",true,project,false)
            if(node) {
                noteNode.filepath = [...node.filepath,file];
                return node.children.push(noteNode)
            } else {
                noteNode.filepath = [file]
                return nodes.push(noteNode)
            }
        }
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

function buildNotePath(noteNode: NoteNode): string {
    return path.join(homedir(), '.CaidoNotesPlusPlus',noteNode.project, ...noteNode.filepath);
}
