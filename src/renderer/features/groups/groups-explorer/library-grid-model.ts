import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import type {
	MediaWallTerminalAction,
	MediaWallTerminalMeta,
} from "../../../types/media-wall";

export type LibraryGridOverlayState =
	| { type: "loading" }
	| { type: "error"; message: string }
	| { type: "empty"; description: string; showAnimeDbDownloadPrompt: boolean }
	| { type: "none" };

export type LibraryGridMenuActionIntent =
	| { type: "edit" }
	| { type: "refresh" }
	| { type: "setIntegrationStatus"; nextStatus: IntegrationStatus | null }
	| { type: "deleteGroup" }
	| { type: "noop" };

function sortedValues(values: Iterable<string>): string[] {
	return Array.from(values).sort((first, second) => first.localeCompare(second));
}

function padDatePart(value: number): string {
	return value.toString().padStart(
		2,
		"0",
	);
}

export function createLibraryVisualStateKey({
																							watchStateOverrides,
																							updatingStatusKeys,
																							deletingKeys,
																							refreshingKeys,
																						}: {
	watchStateOverrides: ReadonlyMap<string, boolean>;
	updatingStatusKeys: ReadonlySet<string>;
	deletingKeys: ReadonlySet<string>;
	refreshingKeys: ReadonlySet<string>;
}): string {
	return [
		sortedValues(watchStateOverrides.keys())
			.map((key) => [
				key,
				watchStateOverrides.get(key) === true,
			] as const)
			.map(([ key, watched ]) => `${ key }:${ watched ? "1" : "0" }`)
			.join("|"),
		sortedValues(updatingStatusKeys).join(","),
		sortedValues(deletingKeys).join(","),
		sortedValues(refreshingKeys).join(","),
	].join("#");
}

export function applyLibraryWatchOverride(
	item: LibraryDisplayItem,
	watchStateOverrides: ReadonlyMap<string, boolean>,
): LibraryDisplayItem {
	const override = watchStateOverrides.get(item.key);
	if (override === undefined) {
		return item;
	}

	return {
		...item,
		isWatched: override,
	};
}

export function getLibraryGridOverlayState({
																						 emptyDescription,
																						 errorMessage,
																						 hasLoadedInitialRange,
																						 isEmptyLibraryDownloadPromptVisible,
																						 totalItems,
																					 }: {
	emptyDescription: string;
	errorMessage: string | null;
	hasLoadedInitialRange: boolean;
	isEmptyLibraryDownloadPromptVisible: boolean;
	totalItems: number;
}): LibraryGridOverlayState {
	if (!hasLoadedInitialRange) {
		return { type: "loading" };
	}

	if (errorMessage) {
		return {
			type:    "error",
			message: errorMessage,
		};
	}

	if (totalItems === 0) {
		return {
			type:                      "empty",
			description:               emptyDescription,
			showAnimeDbDownloadPrompt: isEmptyLibraryDownloadPromptVisible,
		};
	}

	return { type: "none" };
}

export function getLibraryItemAriaLabel(item: LibraryDisplayItem): string {
	return `${ item.kind === "group" ? "Group" : "Media" }: ${ item.name }`;
}

export function getLibraryItemWatchedState(
	item: LibraryDisplayItem,
	watchStateOverrides: ReadonlyMap<string, boolean>,
): boolean {
	return watchStateOverrides.get(item.key) ?? item.isWatched === true;
}

export function createLibraryLastRefreshMeta(lastRefresh: string): MediaWallTerminalMeta[] {
	const refreshDate = new Date(lastRefresh);
	if (Number.isNaN(refreshDate.getTime()) || refreshDate.getTime() <= 0) {
		return [
			{
				label: "last refresh",
				value: "",
			},
			{
				label: "-- date",
				value: "never",
			},
			{
				label: "-- time",
				value: "--:--:--",
			},
		];
	}

	return [
		{
			label: "last refresh",
			value: "",
		},
		{
			label: "-- date",
			value: `${ refreshDate.getFullYear() }/${ padDatePart(refreshDate.getMonth() + 1) }/${ padDatePart(refreshDate.getDate()) }`,
		},
		{
			label: "-- time",
			value: `${ padDatePart(refreshDate.getHours()) }:${ padDatePart(refreshDate.getMinutes()) }:${ padDatePart(refreshDate.getSeconds()) }`,
		},
	];
}

export function getLibraryMenuActions(
	item: LibraryDisplayItem,
	updatingStatusKeys: ReadonlySet<string>,
	deletingKeys: ReadonlySet<string>,
	refreshingKeys: ReadonlySet<string>,
): MediaWallTerminalAction[] {
	const isIgnored                          = item.integrationStatus === "ignored";
	const actions: MediaWallTerminalAction[] = [
		{
			id:    "edit",
			label: item.kind === "group" ? "Edit group" : "Edit media",
		},
		{
			id:      "refresh",
			label:   "Refresh",
			loading: refreshingKeys.has(item.key),
		},
		{
			id:                 isIgnored ? "restore" : "ignore",
			label:              isIgnored ? "Restore" : "Ignore",
			closeMenuBeforeRun: true,
			exitCardBeforeRun:  true,
			loading:            updatingStatusKeys.has(item.key),
		},
	];
	if (item.kind === "group" && item.group) {
		actions.push({
			id:                 "deleteGroup",
			label:              item.group.source === "official" ? "Hide group" : "Delete group",
			closeMenuBeforeRun: true,
			confirmMessage:     "are you sure?",
			danger:             true,
			exitCardBeforeRun:  true,
			loading:            deletingKeys.has(item.key),
		});
	}
	return actions;
}

export function getLibraryMenuActionIntent(
	item: LibraryDisplayItem,
	actionId: string,
): LibraryGridMenuActionIntent {
	switch (actionId) {
		case "edit":
			return { type: "edit" };
		case "refresh":
			return { type: "refresh" };
		case "ignore":
			return {
				type:       "setIntegrationStatus",
				nextStatus: "ignored",
			};
		case "restore":
			return {
				type:       "setIntegrationStatus",
				nextStatus: null,
			};
		case "deleteGroup":
			return item.kind === "group" && item.group
				? { type: "deleteGroup" }
				: { type: "noop" };
		default:
			return { type: "noop" };
	}
}

export function getLibraryMenuMeta(item: LibraryDisplayItem): MediaWallTerminalMeta[] {
	return createLibraryLastRefreshMeta(item.lastRefresh);
}
