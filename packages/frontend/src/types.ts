import { type Caido } from "@caido/sdk-frontend";
import { type API, type BackendEvents } from "backend";

export type FrontendSDK = Caido<API, BackendEvents>;

export interface ModalPosition {
  x: number;
  y: number;
}

export type ActiveEntryWithRaw = { raw?: string };
