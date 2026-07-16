import type { LibraryAdultFilter } from "@nimlat/types/ipc-payloads";
import type { GroupsShellHeaderNavigationIcon } from "../../../types/groups-shell";

export const LIBRARY_SEARCH_COMMIT_DELAY_MS = 220;

interface LibraryMetadataSelectOption {
	label: string;
	value: string;
}

export function getNextLibraryAdultFilter(filter: LibraryAdultFilter): LibraryAdultFilter {
	if (filter === "mixed") {
		return "adult";
	}
	if (filter === "adult") {
		return "nonAdult";
	}
	return "mixed";
}

export function createLibraryMetadataSelectOptions(names: readonly string[]): LibraryMetadataSelectOption[] {
	return names.map((name) => ({
		label: name,
		value: name,
	}));
}

export function getLibraryIgnoreConfirmationTitle(selectedCount: number): string {
	return `Ignore ${ selectedCount } selected item${ selectedCount === 1 ? "" : "s" }?`;
}

export function getLibrarySearchPlaceholder(isIgnoredScope: boolean): string {
	return isIgnoredScope ? "Search ignored content" : "Search library";
}

export function getLibraryShellHeaderTitle(isIgnoredScope: boolean): string {
	return isIgnoredScope ? "Ignored" : "Library";
}

export function getLibraryShellNavigationIcon(isIgnoredScope: boolean): GroupsShellHeaderNavigationIcon {
	return isIgnoredScope ? "back" : "home";
}
