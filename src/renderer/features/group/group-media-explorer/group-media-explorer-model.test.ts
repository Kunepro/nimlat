// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import { ROUTES } from "../../../constants/route-config";
import {
	createEditableGroupNavigationTarget,
	getGroupMediaGridOverlayState,
	isSameGroupMediaExplorerRef,
	resolveGroupMediaExplorerRef,
	resolveGroupMediaPreviousWatchState,
	restoreGroupMediaWatchOverride,
	setGroupMediaWatchOverride,
	shouldApplyGroupMediaPatchEvent,
	shouldRefreshGroupMediaForListChange,
	shouldShowGroupMediaRemoveUndo,
} from "./group-media-explorer-model";

describe(
	"group-media-explorer-model",
	() => {
		it(
			"resolves only supported routed group refs",
			() => {
				expect(resolveGroupMediaExplorerRef(
					"official",
					"12",
				)).toEqual({
					source:  "official",
					groupId: 12,
				});
				expect(resolveGroupMediaExplorerRef(
					"user",
					"3",
				)).toEqual({
					source:  "user",
					groupId: 3,
				});
				expect(resolveGroupMediaExplorerRef(
					"other",
					"3",
				)).toBeNull();
				expect(resolveGroupMediaExplorerRef(
					"user",
					"not-a-number",
				)).toBeNull();
			},
		);

		it(
			"compares group refs by source and id",
			() => {
				expect(isSameGroupMediaExplorerRef(
					{
						source:  "user",
						groupId: 1,
					},
					{
						source:  "user",
						groupId: 1,
					},
				)).toBe(true);
				expect(isSameGroupMediaExplorerRef(
					{
						source:  "official",
						groupId: 1,
					},
					{
						source:  "user",
						groupId: 1,
					},
				)).toBe(false);
				expect(isSameGroupMediaExplorerRef(
					undefined,
					{
						source:  "user",
						groupId: 1,
					},
				)).toBe(false);
			},
		);

		it(
			"builds editable user-group navigation only when official group removal materializes a user copy",
			() => {
				const group = {
					groupId:            12,
					name:               "Cowboy Bebop",
					mediasCount:        2,
					watchedMediasCount: 1,
					integrationPercent: null,
					integrationStatus:  null,
				};

				expect(createEditableGroupNavigationTarget(
					null,
					"official",
				)).toBeNull();
				expect(createEditableGroupNavigationTarget(
					group,
					"user",
				)).toBeNull();

				const target = createEditableGroupNavigationTarget(
					group,
					"official",
				);
				expect(target).toMatchObject({
					to:      ROUTES.GROUPS.GROUP.FULL_URL,
					params:  {
						groupSource: "user",
						groupId:     "12",
					},
					replace: true,
				});
				const updateState = target?.state as (previousState: Record<string, unknown>) => Record<string, unknown>;
				expect(updateState({ key: "existing" })).toMatchObject({
					key:       "existing",
					groupName: "Cowboy Bebop",
				});
			},
		);

		it(
			"allows undo only for single explicit removals",
			() => {
				expect(shouldShowGroupMediaRemoveUndo(
					true,
					1,
				)).toBe(true);
				expect(shouldShowGroupMediaRemoveUndo(
					false,
					1,
				)).toBe(false);
				expect(shouldShowGroupMediaRemoveUndo(
					true,
					2,
				)).toBe(false);
			},
		);

		it(
			"derives the media grid overlay state in priority order",
			() => {
				expect(getGroupMediaGridOverlayState({
					hasLoadedMediaRange:    false,
					mediaRangeErrorMessage: "Still ignored",
					totalMediaItems:        0,
				})).toEqual({ type: "loading" });
				expect(getGroupMediaGridOverlayState({
					hasLoadedMediaRange:    true,
					mediaRangeErrorMessage: "Boom",
					totalMediaItems:        0,
				})).toEqual({
					type:    "error",
					message: "Boom",
				});
				expect(getGroupMediaGridOverlayState({
					hasLoadedMediaRange:    true,
					mediaRangeErrorMessage: null,
					totalMediaItems:        0,
				})).toEqual({ type: "empty" });
				expect(getGroupMediaGridOverlayState({
					hasLoadedMediaRange:    true,
					mediaRangeErrorMessage: null,
					totalMediaItems:        3,
				})).toEqual({ type: "none" });
			},
		);

		it(
			"scopes media list invalidations to the active group",
			() => {
				const groupRef = {
					source:  "user" as const,
					groupId: 7,
				};

				expect(shouldRefreshGroupMediaForListChange(
					null,
					{
						groups:           [ groupRef ],
						affectedMediaIds: [ 1 ],
					},
				)).toBe(false);
				expect(shouldRefreshGroupMediaForListChange(
					groupRef,
					{
						groups:           undefined,
						affectedMediaIds: [ 1 ],
					},
				)).toBe(true);
				expect(shouldRefreshGroupMediaForListChange(
					groupRef,
					{
						groups:           [
							{
								source:  "official",
								groupId: 7,
							},
						],
						affectedMediaIds: [ 1 ],
					},
				)).toBe(false);
				expect(shouldRefreshGroupMediaForListChange(
					groupRef,
					{
						groups:           [ groupRef ],
						affectedMediaIds: [ 1 ],
					},
				)).toBe(true);
			},
		);

		it(
			"scopes media patch events to populated patches for the active group",
			() => {
				const groupRef = {
					source:  "official" as const,
					groupId: 4,
				};
				const patch    = {
					mediaId: 9,
					name:    "Patched",
				};

				expect(shouldApplyGroupMediaPatchEvent(
					null,
					{
						group:   groupRef,
						patches: [ patch ],
					},
				)).toBe(false);
				expect(shouldApplyGroupMediaPatchEvent(
					groupRef,
					{
						group:   groupRef,
						patches: [],
					},
				)).toBe(false);
				expect(shouldApplyGroupMediaPatchEvent(
					groupRef,
					{
						group:   {
							source:  "user",
							groupId: 4,
						},
						patches: [ patch ],
					},
				)).toBe(false);
				expect(shouldApplyGroupMediaPatchEvent(
					groupRef,
					{
						group:   undefined,
						patches: [ patch ],
					},
				)).toBe(true);
				expect(shouldApplyGroupMediaPatchEvent(
					groupRef,
					{
						group:   groupRef,
						patches: [ patch ],
					},
				)).toBe(true);
			},
		);

		it(
			"applies and restores watched-state overrides without clobbering newer toggles",
			() => {
				const media               = {
					mediaId:     9,
					name:        "Media",
					isWatched:   false,
					lastRefresh: "",
					isFilm:      false,
				};
				const optimisticOverrides = setGroupMediaWatchOverride(
					new Map(),
					9,
					true,
				);

				expect(resolveGroupMediaPreviousWatchState(
					media,
					new Map(),
				)).toBe(false);
				expect(resolveGroupMediaPreviousWatchState(
					media,
					optimisticOverrides,
				)).toBe(true);
				expect(Array.from(restoreGroupMediaWatchOverride(
					optimisticOverrides,
					9,
					true,
					false,
				))).toEqual([
					[
						9,
						false,
					],
				]);
				expect(restoreGroupMediaWatchOverride(
					setGroupMediaWatchOverride(
						optimisticOverrides,
						9,
						false,
					),
					9,
					true,
					false,
				)).toEqual(new Map([
					[
						9,
						false,
					],
				]));
			},
		);
	},
);
