import * as fs from "fs";

import { type SDK } from "caido:plugin";

import type { API } from "../index";
import type { BackendEvents } from "../types/events";

export function getFileContent(
  _sdk: SDK<API, BackendEvents>,
  filePath: string,
): string {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return content;
  } catch (error) {
    return `Error reading file: ${error}`;
  }
}
