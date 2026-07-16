import { registerGroupExplorerEditHandlers } from "./group-explorer/group-explorer-edit-handlers";
import { registerGroupExplorerReadHandlers } from "./group-explorer/group-explorer-read-handlers";
import { registerGroupExplorerStatusHandlers } from "./group-explorer/group-explorer-status-handlers";

// Keep the public IPC bootstrap stable while each handler cluster stays small
// enough to remain a transport adapter instead of accumulating feature logic.
export function registerGroupExplorerHandlers(): void {
	registerGroupExplorerReadHandlers();
	registerGroupExplorerEditHandlers();
	registerGroupExplorerStatusHandlers();
}
