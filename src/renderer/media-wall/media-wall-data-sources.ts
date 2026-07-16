import {
	GroupInspectionMediaCard,
	LibraryDisplayFilters,
	LibraryDisplayItem,
	LibraryDisplayScope,
} from "@nimlat/types/ipc-payloads";
import { GroupRef } from "@nimlat/types/nimlat-ids";
import { GroupExplorerFacade } from "../facades";
import type { MediaWallDataSource } from "../types/media-wall";

export function createLibraryMediaWallDataSource(scope: LibraryDisplayScope, filters: Partial<LibraryDisplayFilters> = {}): MediaWallDataSource<LibraryDisplayItem> {
	return {
		loadRange: (request) => GroupExplorerFacade.listLibraryItemsRange({
			...request,
			scope,
			...filters,
		}),
	};
}

export function createGroupMediaWallDataSource(group: GroupRef): MediaWallDataSource<GroupInspectionMediaCard> {
	return {
		loadRange: (request) => GroupExplorerFacade.listGroupMediaRange({
			...request,
			group,
		}),
	};
}
