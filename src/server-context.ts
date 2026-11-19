import type { BbPluginApi, PluginRpcHandlers } from "@get-bb/plugin-sdk";
import type { threadInboxRpcContract } from "./contract";

export interface ServerContext {
  bb: BbPluginApi;
  db: ReturnType<BbPluginApi["storage"]["database"]>;
}

export type ServerHandlers = PluginRpcHandlers<typeof threadInboxRpcContract>;
