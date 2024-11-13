import { marked } from 'marked';
import markedAlert from 'marked-alert';
import {markedHighlight} from "marked-highlight";
import hljs from 'highlight.js';

// extensions
import {customLinkExtension} from "@/plugins/CustomLinkMarkedExtension";
import {imagePasteMarkedExtension} from "@/plugins/ImagePasteMarkedExtension";

let isConfigured = false;

export function configureMarked(sdk) {
    if (isConfigured) return;

    marked.use({
        async: true,
        async walkTokens(token) {
            if (token.type === 'imagePasteMarkedExtension') {
                for (let file of sdk.files.getAll()) {
                    console.log(`Checking for match between ${file.id} and ${token.id}`);
                    if (file.id === token.id) {
                        console.log("MATCH", file.path)
                        try {
                            token.fileName = file.name
                            token.dataUrl = await sdk.backend.fetchImage(file)
                            break
                        } catch (e) {
                            console.log("FILE LOAD ERROR: ", e);
                        }
                    }
                }
            }
        },
        extensions: [customLinkExtension, imagePasteMarkedExtension]
    });

    marked.use(markedAlert());
    marked.use(markedHighlight({
        langPrefix: 'hljs language-',
        highlight(code, lang) {
            const language = hljs.getLanguage(lang) ? lang : 'plaintext';
            return hljs.highlight(code, { language }).value;
        }
    }));

    isConfigured = true;
}

export { marked };