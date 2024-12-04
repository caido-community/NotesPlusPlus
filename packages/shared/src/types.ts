export class NoteNode {
    key: string;
    label: string;
    data: string;
    icon: string;
    selectable: boolean;
    project: string;
    isFolder: boolean;
    parent: NoteNode;
    filepath: string[];
    children: NoteNode[];


    constructor(key: string, text: string, label: string, icon: string, selectable: boolean, project: string, isFolder: boolean, children?: NoteNode[]) {
        this.key = key;
        this.data = text;
        this.label = label;
        this.icon = icon;
        this.selectable = selectable;
        this.project = project;
        this.isFolder = isFolder;
        if(children) {
            this.children = children;
        } else if(isFolder) {
            this.children = [];
        }
    }

    toString(): string {
        return `{key:${this.key} -- project: ${this.project} -- label: ${this.label} -- isFolder: ${this.isFolder} children: [${this.children}]}`;
    }

    toJSON(): any {
        return {
            key: this.key,
            data: this.data,
            label: this.label,
            icon: this.icon,
            selectable: this.selectable,
            project: this.project,
            isFolder: this.isFolder,
            children: this.children,
            filepath: this.filepath,
            //parent: this.parent,
        };
    }

}
