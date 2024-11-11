import { readFileSync } from 'fs';
import type {Caido} from "@caido/sdk-frontend";
import {fetchImage} from "backend/src/storage/databaseAccess";

const imagePasteMarkedExtension = {
    name: 'imagePasteMarkedExtension',
    level: 'inline',
    start(src: string) { return src.match(/\{[a-f0-9]/)?.index; },
    tokenizer(src: string) {
        console.log("TOKENIZER: ",src);
        const rule = /\{([a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12})}/;
        const match = rule.exec(src);
        if (match) {
            console.log("MATCH: ",match[0],match[1]);
            return {
                type: 'imagePasteMarkedExtension',
                raw: match[0],
                id: match[1],
            };
        }
    },
    renderer(token: any) {
        for(let file of Caido.files.getAll()) {
            if( file.id == token.id ) {
                try {
                    const dataUrl = fetchImage(file.path)
                    return `<img src="${dataUrl}" alt="${file.name}">`;
                } catch (e) {
                    console.error("FILE LOAD ERROR: ",e);
                }
            }
        }
        return `ERROR`;
    }
};

function createBlobUrlFromFilePath(filePath: string): string {
    try {
        // Read the file contents
        const fileBuffer = Caido.backend.fetchImage(filePath)

        // Create a blob from the file buffer
        const blob = new Blob([fileBuffer]);

        // Create and return the blob URL
        return URL.createObjectURL(blob);
    } catch (error) {
        throw new Error(`Failed to create blob URL: ${error}`);
    }
}

export {imagePasteMarkedExtension};