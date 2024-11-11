import type {Caido} from "@caido/sdk-frontend";
import {useSDK} from "@/plugins/sdk";
import {
    ReplaySession
} from "@caido/sdk-frontend/src/types/replay";

const customLinkExtension = {
    name: 'ReplayLink',
    level: 'inline',
    start(src: string) { return src.match(/@\[/)?.index; },
    tokenizer(src: string) {
        const rule = /^@\[([a-zA-Z0-9- ]+)]/;
        const match = rule.exec(src);
        if (match) {
            return {
                type: 'ReplayLink',
                raw: match[0],
                id: match[1],
            };
        }
    },
    renderer(token: any) {
        return `<a href="#" class="custom-link" data-id="${token.id}">${token.id}</a>`;
    }
};


const handleCustomLinkClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const sdk = useSDK();

    if (target.classList.contains('custom-link')) {
        e.preventDefault();
        const id = target.getAttribute('data-id');
        console.log(`Custom link clicked: ${id}`);
        const sessions:ReplaySession[] = Caido.replay.getSessions()
        console.log("Sessions: ",sessions)
        for(let session of sessions) {
            console.log(session.name,id)
            if( session.name == id) {
                Caido.navigation.goTo("/replay");
                Caido.replay.openTab(session.id)
                break
            }
        }
    }
};

export {customLinkExtension, handleCustomLinkClick};