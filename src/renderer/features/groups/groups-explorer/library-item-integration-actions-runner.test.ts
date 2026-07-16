import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../../../facades";
import { summarizeLibraryItemActionOutcomes } from "./library-item-actions-model";
import {
	collectLibraryItemIntegrationActionOutcomes,
	persistLibraryItemIntegrationStatus,
} from "./library-item-integration-actions-runner";

function createMediaItem(mediaId: number): LibraryDisplayItem {
	return {
		key:         `media:${ mediaId }`,
		kind:        "media",
		name:        `Media ${ mediaId }`,
		mediaId,
		lastRefresh: "",
	};
}

function createGroupItem(groupId: number): LibraryDisplayItem {
	return {
		key:         `group:user:${ groupId }`,
		kind:        "group",
		name:        `Group ${ groupId }`,
		group:       {
			source: "user",
			groupId,
		},
		lastRefresh: "",
	};
}

describe(
	"library item integration action runner",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"persists media and group integration status through the group explorer facade",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupExplorerFacade,
					"setGroupIntegrationStatus",
				).mockResolvedValue({ success: true });

				await expect(persistLibraryItemIntegrationStatus(
					createMediaItem(7),
					"tracked",
				)).resolves.toEqual({ success: true });
				await expect(persistLibraryItemIntegrationStatus(
					createGroupItem(3),
					"ignored",
				)).resolves.toEqual({ success: true });

				expect(GroupExplorerFacade.setMediaIntegrationStatus).toHaveBeenCalledWith({
					mediaId:           7,
					integrationStatus: "tracked",
				});
				expect(GroupExplorerFacade.setGroupIntegrationStatus).toHaveBeenCalledWith({
					group:             {
						source:  "user",
						groupId: 3,
					},
					integrationStatus: "ignored",
				});
			},
		);

		it(
			"returns null instead of writing when the library item has no integration target",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockResolvedValue({ success: true });
				vi.spyOn(
					GroupExplorerFacade,
					"setGroupIntegrationStatus",
				).mockResolvedValue({ success: true });

				await expect(persistLibraryItemIntegrationStatus(
					{
						key:         "media:missing",
						kind:        "media",
						name:        "Missing target",
						lastRefresh: "",
					},
					"ignored",
				)).resolves.toBeNull();

				expect(GroupExplorerFacade.setMediaIntegrationStatus).not.toHaveBeenCalled();
				expect(GroupExplorerFacade.setGroupIntegrationStatus).not.toHaveBeenCalled();
			},
		);

		it(
			"collects partial batch outcomes without throwing on write failures",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"setMediaIntegrationStatus",
				).mockImplementation(({ mediaId }) => {
					if (mediaId === 2) {
						return Promise.resolve({
							success: false,
							error:   "write rejected",
						});
					}
					if (mediaId === 3) {
						return Promise.reject(new Error("ipc down"));
					}
					return Promise.resolve({ success: true });
				});

				const outcomes = await collectLibraryItemIntegrationActionOutcomes(
					[
						createMediaItem(1),
						createMediaItem(2),
						createMediaItem(3),
						{
							key:         "media:missing",
							kind:        "media",
							name:        "Missing target",
							lastRefresh: "",
						},
					],
					"ignored",
				);

				expect(summarizeLibraryItemActionOutcomes(outcomes)).toEqual({
					succeededKeySet: new Set([ "media:1" ]),
					succeededCount:  1,
					failedMessages:  [
						"Media 2: write rejected",
						"Media 3: ipc down",
						"Missing target: item has no integration target",
					],
					failedCount:     3,
				});
			},
		);
	},
);
