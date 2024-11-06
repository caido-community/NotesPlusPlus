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

function waitForElm(selector, detatch=true) {

    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        }

        const observer = new MutationObserver(() => {
            if (document.querySelector(selector)) {
                if( detatch ) {
                    observer.disconnect();
                }
                resolve(document.querySelector(selector));
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
}


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

      /*  Caido.navigation.goTo("/replay");
        const event = new MouseEvent("mousedown", { button: 0 });


        waitForElm('.c-replay').then((elm) => {
            console.log("REPLAY:" ,elm);
            let replayTabs = document.getElementsByClassName("c-tree-item__item");
            console.log(replayTabs,replayTabs.length);
            for (let i = 0; i < replayTabs.length; i++) {
                console.log(i, replayTabs[i].innerText, id, replayTabs[i].innerText == id);
                if( replayTabs[i].innerText == id ) {
                    console.log("found:",replayTabs[i]);
                    replayTabs[i].dispatchEvent(event);
                    //replayTabs[i].dispatchEvent(event);
                    // let wrapperDiv = document.createElement("div");
                    // wrapperDiv.classList.add("c-request-header__action");
                    // let icon = document.createElement("i");
                    // icon.classList.add("c-icon", "fas", "fa-code");
                    // wrapperDiv.appendChild(icon);
                    // console.log("REQUEST HEADER:" ,document.getElementsByClassName("c-request-header")[0])
                    // document.getElementsByClassName("c-request-header")[0].appendChild(wrapperDiv);
                }
            }
        });*/
    }
};

export {customLinkExtension, handleCustomLinkClick};