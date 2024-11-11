const imagePasteMarkedExtension = {
    name: 'imagePasteMarkedExtension',
    level: 'inline',
    start(src: string) {
        return src.match(/\{[a-f0-9]/)?.index;
    },
    tokenizer(src: string) {
        console.log("TOKENIZER: ", src);
        const rule = /\{([a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12})}/;
        const match = rule.exec(src);
        if (match) {
            console.log("MATCH: ", match[0], match[1]);
            return {
                type: 'imagePasteMarkedExtension',
                raw: match[0],
                id: match[1],
            };
        }
    },
    renderer(token: any) {
        return `<img src="${token.dataUrl}" alt="${token.fileName}">`;
    }
}


export {imagePasteMarkedExtension};