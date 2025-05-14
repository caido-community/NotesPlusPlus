import { type Folder, type TreeNode } from "shared";

export function getNodeKey(node: TreeNode): string {
  return (
    node.path + (node.type === "folder" ? (node as Folder).children.length : "")
  );
}
