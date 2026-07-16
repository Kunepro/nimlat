import type { ErroredContentQueue } from "@nimlat/types/ipc-payloads";

export type QueueFilter = ErroredContentQueue | "all";
export type RowAction = "retry" | "hide" | "report";
