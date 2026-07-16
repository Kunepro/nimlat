import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyLibraryWatchOverride,
	createLibraryLastRefreshMeta,
	createLibraryVisualStateKey,
	getLibraryGridOverlayState,
	getLibraryItemAriaLabel,
	getLibraryItemWatchedState,
	getLibraryMenuActionIntent,
	getLibraryMenuActions,
} from "./library-grid-model";

function createItem(overrides: Partial<LibraryDisplayItem> = {}): LibraryDisplayItem {
	return {
		key:         "media:1",
		kind:        "media",
		name:        "Library Media",
		lastRefresh: "2026-07-03T10:20:30.000Z",
		...overrides,
	};
}

describe(
	"library grid model",
	() => {
		it(
			"keeps visual state keys deterministic",
			() => {
				expect(createLibraryVisualStateKey({
					watchStateOverrides: new Map([
						[
							"b",
							false,
						],
						[
							"a",
							true,
						],
					]),
					updatingStatusKeys:  new Set([
						"z",
						"a",
					]),
					deletingKeys:        new Set([ "b" ]),
					refreshingKeys:      new Set([ "c" ]),
				})).toBe("a:1|b:0#a,z#b#c");
			},
		);

		it(
			"applies watch overrides without cloning unchanged items",
			() => {
				const item = createItem({ isWatched: false });

				expect(applyLibraryWatchOverride(
					item,
					new Map(),
				)).toBe(item);
				expect(applyLibraryWatchOverride(
					item,
					new Map([
						[
							item.key,
							true,
						],
					]),
				)).toEqual({
					...item,
					isWatched: true,
				});
			},
		);

		it(
			"derives library item aria labels and watched state",
			() => {
				const mediaItem = createItem({
					isWatched: false,
					name:      "Planetes",
				});
				const groupItem = createItem({
					key:   "group:user:8",
					kind:  "group",
					name:  "Space Shows",
					group: {
						source:  "user",
						groupId: 8,
					},
				});

				expect(getLibraryItemAriaLabel(mediaItem)).toBe("Media: Planetes");
				expect(getLibraryItemAriaLabel(groupItem)).toBe("Group: Space Shows");
				expect(getLibraryItemWatchedState(
					mediaItem,
					new Map(),
				)).toBe(false);
				expect(getLibraryItemWatchedState(
					mediaItem,
					new Map([
						[
							mediaItem.key,
							true,
						],
					]),
				)).toBe(true);
			},
		);

		it(
			"builds menu actions for media and group items",
			() => {
				expect(getLibraryMenuActions(
					createItem(),
					new Set(),
					new Set(),
					new Set(),
				).map(action => action.id)).toEqual([
					"edit",
					"refresh",
					"ignore",
				]);
				expect(getLibraryMenuActions(
					createItem({
						key:   "group:official:7",
						kind:  "group",
						group: {
							source:  "official",
							groupId: 7,
						},
					}),
					new Set(),
					new Set([ "group:official:7" ]),
					new Set(),
				)).toMatchObject([
					{
						id: "edit",
					},
					{
						id: "refresh",
					},
					{
						id: "ignore",
					},
					{
						id:      "deleteGroup",
						label:   "Hide group",
						loading: true,
					},
				]);
			},
		);

		it(
			"maps terminal action ids to menu action intents",
			() => {
				const groupItem = createItem({
					key:   "group:user:7",
					kind:  "group",
					group: {
						source:  "user",
						groupId: 7,
					},
				});

				expect(getLibraryMenuActionIntent(
					createItem(),
					"edit",
				)).toEqual({ type: "edit" });
				expect(getLibraryMenuActionIntent(
					createItem(),
					"refresh",
				)).toEqual({ type: "refresh" });
				expect(getLibraryMenuActionIntent(
					createItem(),
					"ignore",
				)).toEqual({
					type:       "setIntegrationStatus",
					nextStatus: "ignored",
				});
				expect(getLibraryMenuActionIntent(
					createItem(),
					"restore",
				)).toEqual({
					type:       "setIntegrationStatus",
					nextStatus: null,
				});
				expect(getLibraryMenuActionIntent(
					groupItem,
					"deleteGroup",
				)).toEqual({ type: "deleteGroup" });
				expect(getLibraryMenuActionIntent(
					createItem(),
					"deleteGroup",
				)).toEqual({ type: "noop" });
				expect(getLibraryMenuActionIntent(
					createItem(),
					"unknown",
				)).toEqual({ type: "noop" });
			},
		);

		it(
			"formats missing refresh metadata",
			() => {
				expect(createLibraryLastRefreshMeta("")).toEqual([
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
				]);
			},
		);

		it(
			"derives the grid overlay state in priority order",
			() => {
				expect(getLibraryGridOverlayState({
					emptyDescription:                    "No items",
					errorMessage:                        null,
					hasLoadedInitialRange:               false,
					isEmptyLibraryDownloadPromptVisible: true,
					totalItems:                          0,
				})).toEqual({ type: "loading" });
				expect(getLibraryGridOverlayState({
					emptyDescription:                    "No items",
					errorMessage:                        "Boom",
					hasLoadedInitialRange:               true,
					isEmptyLibraryDownloadPromptVisible: true,
					totalItems:                          0,
				})).toEqual({
					type:    "error",
					message: "Boom",
				});
				expect(getLibraryGridOverlayState({
					emptyDescription:                    "No items",
					errorMessage:                        null,
					hasLoadedInitialRange:               true,
					isEmptyLibraryDownloadPromptVisible: true,
					totalItems:                          0,
				})).toEqual({
					type:                      "empty",
					description:               "No items",
					showAnimeDbDownloadPrompt: true,
				});
				expect(getLibraryGridOverlayState({
					emptyDescription:                    "No items",
					errorMessage:                        null,
					hasLoadedInitialRange:               true,
					isEmptyLibraryDownloadPromptVisible: false,
					totalItems:                          12,
				})).toEqual({ type: "none" });
			},
		);
	},
);
