import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	applyGroupMediaWatchOverride,
	createGroupMediaLastRefreshMeta,
	createGroupMediaVisualStateKey,
	getGroupMediaAriaLabel,
	getGroupMediaMenuActions,
	getGroupMediaWatchedState,
	GROUP_MEDIA_REFRESH_COOLDOWN_MS,
	isGroupMediaRefreshCooldownActive,
	resolveGroupMediaMenuActionEffect,
} from "./group-media-grid-model";

function createMedia(overrides: Partial<GroupInspectionMediaCard> = {}): GroupInspectionMediaCard {
	return {
		mediaId:           42,
		name:              "Nimlat Sample",
		lastRefresh:       "2026-07-03T12:00:00.000Z",
		isFilm:            false,
		integrationStatus: null,
		...overrides,
	};
}

describe(
	"group media grid model",
	() => {
		it(
			"keeps visual state keys deterministic for watch overrides",
			() => {
				const overrides = new Map<number, boolean>([
					[
						7,
						false,
					],
					[
						2,
						true,
					],
				]);

				expect(createGroupMediaVisualStateKey(overrides)).toBe("2:1|7:0");
			},
		);

		it(
			"applies watch overrides without cloning unchanged medias",
			() => {
				const media = createMedia({ isWatched: false });

				expect(applyGroupMediaWatchOverride(
					media,
					new Map(),
				)).toBe(media);
				expect(applyGroupMediaWatchOverride(
					media,
					new Map([
						[
							media.mediaId,
							true,
						],
					]),
				)).toEqual({
					...media,
					isWatched: true,
				});
			},
		);

		it(
			"derives media aria labels and watched state",
			() => {
				const media = createMedia({
					isWatched: false,
					name:      "Planetes",
				});

				expect(getGroupMediaAriaLabel(media)).toBe("Media: Planetes");
				expect(getGroupMediaWatchedState(
					media,
					new Map(),
				)).toBe(false);
				expect(getGroupMediaWatchedState(
					media,
					new Map([
						[
							media.mediaId,
							true,
						],
					]),
				)).toBe(true);
			},
		);

		it(
			"disables refresh during cooldown unless hydration failed",
			() => {
				const lastRefresh = "2026-07-03T12:00:00.000Z";
				const nowMs       = new Date(lastRefresh).getTime() + GROUP_MEDIA_REFRESH_COOLDOWN_MS - 1;

				expect(isGroupMediaRefreshCooldownActive(
					createMedia({ lastRefresh }),
					nowMs,
				)).toBe(true);
				expect(isGroupMediaRefreshCooldownActive(
					createMedia({
						lastRefresh,
						hasHydrationIssue: true,
					}),
					nowMs,
				)).toBe(false);
			},
		);

		it(
			"builds media-wall menu actions and refresh metadata",
			() => {
				expect(getGroupMediaMenuActions(createMedia({ integrationStatus: "ignored" }))
					.map(action => action.id)).toEqual([
					"edit",
					"refresh",
					"restore",
					"removeFromGroup",
				]);
				expect(createGroupMediaLastRefreshMeta("")).toEqual([
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
			"resolves terminal menu action effects without leaking action ids into hooks",
			() => {
				const lastRefresh     = "2026-07-03T12:00:00.000Z";
				const media           = createMedia({ lastRefresh });
				const afterCooldownMs = new Date(lastRefresh).getTime() + GROUP_MEDIA_REFRESH_COOLDOWN_MS + 1;

				expect(resolveGroupMediaMenuActionEffect(
					media,
					"edit",
					afterCooldownMs,
				)).toEqual({ type: "edit" });
				expect(resolveGroupMediaMenuActionEffect(
					media,
					"refresh",
					afterCooldownMs,
				)).toEqual({
					type:    "refresh",
					mediaId: media.mediaId,
				});
				expect(resolveGroupMediaMenuActionEffect(
					media,
					"ignore",
					afterCooldownMs,
				)).toEqual({
					type:       "updateIntegrationStatus",
					mediaId:    media.mediaId,
					nextStatus: "ignored",
				});
				expect(resolveGroupMediaMenuActionEffect(
					media,
					"restore",
					afterCooldownMs,
				)).toEqual({
					type:       "updateIntegrationStatus",
					mediaId:    media.mediaId,
					nextStatus: null,
				});
				expect(resolveGroupMediaMenuActionEffect(
					media,
					"removeFromGroup",
					afterCooldownMs,
				)).toEqual({ type: "removeFromGroup" });
				expect(resolveGroupMediaMenuActionEffect(
					media,
					"missing",
					afterCooldownMs,
				)).toEqual({ type: "none" });
			},
		);

		it(
			"drops refresh menu effects during cooldown",
			() => {
				const lastRefresh      = "2026-07-03T12:00:00.000Z";
				const duringCooldownMs = new Date(lastRefresh).getTime() + GROUP_MEDIA_REFRESH_COOLDOWN_MS - 1;

				expect(resolveGroupMediaMenuActionEffect(
					createMedia({ lastRefresh }),
					"refresh",
					duringCooldownMs,
				)).toEqual({ type: "none" });
			},
		);
	},
);
