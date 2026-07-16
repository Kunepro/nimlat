import type {
	LibraryDisplayFilters,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import type { Observable } from "rxjs";
import {
	GroupExplorerFacade,
	UserConfigFacade,
} from "../../../facades";

// Read/write boundary for Library display settings. The hook owns UI state and
// adult-off normalization; this runner only centralizes facade access.
export function getLibraryAdultContentStatus(): Promise<boolean> {
	return UserConfigFacade.getAdultContentStatus();
}

export function getLibraryDisplayFilters(): Promise<LibraryDisplayFilters> {
	return UserConfigFacade.getLibraryDisplayFilters();
}

export function listLibraryFilterOptions(): Promise<LibraryFilterOptions> {
	return GroupExplorerFacade.listLibraryFilterOptions();
}

export function saveLibraryDisplayFilters(filters: LibraryDisplayFilters): Promise<void> {
	return UserConfigFacade.setLibraryDisplayFilters(filters);
}

export function libraryAdultContentStatusChanges(): Observable<boolean> {
	return UserConfigFacade.adultContentStatusChanges();
}
