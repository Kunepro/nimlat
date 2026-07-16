// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const groupListChangedNext          = vi.fn();
const groupMediaListChangedNext     = vi.fn();
const mediaEpisodesListChangedNext  = vi.fn();
const tryHandleCatalogMediaMutation = vi.fn();
const tryHandleIntegrationCascade   = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_GroupListChanged:         {
			next: groupListChangedNext,
		},
		BUS_GroupMediaListChanged:    {
			next: groupMediaListChangedNext,
		},
		BUS_MediaEpisodesListChanged: {
			next: mediaEpisodesListChangedNext,
		},
	}),
);

vi.mock(
	"../release-watch/release-watch-coordinator",
	() => ({
		ReleaseWatchCoordinator: {
			tryHandleCatalogMediaMutation,
			tryHandleIntegrationCascade,
		},
	}),
);

describe(
	"LibrarySideEffectsCoordinator",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
		});

		it(
			"publishes full integration and release-watch invalidation",
			async () => {
				const { LibrarySideEffectsCoordinator } = await import("./library-side-effects-coordinator");

				LibrarySideEffectsCoordinator.handleIntegrationCascade({
					affectedMediaIds: [
						11,
						22,
					],
					affectedGroups: [
						{
							source:  "official",
							groupId: 7,
						},
					],
				});

				expect(mediaEpisodesListChangedNext).toHaveBeenCalledTimes(2);
				expect(mediaEpisodesListChangedNext).toHaveBeenNthCalledWith(
					1,
					{ mediaId: 11 },
				);
				expect(mediaEpisodesListChangedNext).toHaveBeenNthCalledWith(
					2,
					{ mediaId: 22 },
				);
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups: [
						{
							source:  "official",
							groupId: 7,
						},
					],
					affectedMediaIds: [
						11,
						22,
					],
				});
				expect(groupListChangedNext).toHaveBeenCalledWith({
					affectedGroups: [
						{
							source:  "official",
							groupId: 7,
						},
					],
				});
				expect(tryHandleIntegrationCascade).toHaveBeenCalledWith(
					[
						11,
						22,
					],
					"integration-cascade",
				);
			},
		);

		it(
			"publishes grouping invalidation without media-episodes invalidation",
			async () => {
				const { LibrarySideEffectsCoordinator } = await import("./library-side-effects-coordinator");

				LibrarySideEffectsCoordinator.handleGroupingMutation({
					affectedMediaIds: [ 33 ],
					affectedGroups: [
						{
							source:  "user",
							groupId: 9,
						},
						{
							source:  "user",
							groupId: 10,
						},
					],
					context:          "manual-group-merge",
				});

				expect(mediaEpisodesListChangedNext).not.toHaveBeenCalled();
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					groups: [
						{
							source:  "user",
							groupId: 9,
						},
						{
							source:  "user",
							groupId: 10,
						},
					],
					affectedMediaIds: [ 33 ],
				});
				expect(groupListChangedNext).toHaveBeenCalledWith({
					affectedGroups: [
						{
							source:  "user",
							groupId: 9,
						},
						{
							source:  "user",
							groupId: 10,
						},
					],
				});
			},
		);

		it(
			"handles a catalog-only mutation without renderer invalidation",
			async () => {
				const { LibrarySideEffectsCoordinator } = await import("./library-side-effects-coordinator");

				LibrarySideEffectsCoordinator.handleCatalogMediaMutation({
					affectedMediaIds:            [ 44 ],
					context:                     "catalog-refresh",
					publishRendererInvalidation: false,
				});

				expect(mediaEpisodesListChangedNext).not.toHaveBeenCalled();
				expect(groupMediaListChangedNext).not.toHaveBeenCalled();
				expect(groupListChangedNext).not.toHaveBeenCalled();
				expect(tryHandleCatalogMediaMutation).toHaveBeenCalledWith({
					affectedMediaIds: [ 44 ],
					context:          "catalog-refresh",
				});
			},
		);
	},
);
