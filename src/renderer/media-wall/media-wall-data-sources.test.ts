import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { GroupExplorerFacade } from "../facades";
import {
	createGroupMediaWallDataSource,
	createLibraryMediaWallDataSource,
} from "./media-wall-data-sources";

describe(
	"media-wall-data-sources",
	() => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it(
			"loads library wall ranges with scope and filters merged into the range request",
			async () => {
				vi.spyOn(
					GroupExplorerFacade,
					"listLibraryItemsRange",
				).mockResolvedValue({
					items:  [],
					offset: 0,
					total:  0,
				});

				const dataSource = createLibraryMediaWallDataSource(
					"ignored",
					{
						displayMode: "rawMedia",
						genreNames:  [ "Drama" ],
					},
				);

				await dataSource.loadRange({
					offset: 10,
					limit:  20,
					search: "eva",
				});

				expect(GroupExplorerFacade.listLibraryItemsRange).toHaveBeenCalledWith({
					offset:      10,
					limit:       20,
					search:      "eva",
					scope:       "ignored",
					displayMode: "rawMedia",
					genreNames:  [ "Drama" ],
				});
			},
		);

		it(
			"loads group media wall ranges with the routed group merged into the range request",
			async () => {
				const group = {
					source:  "user" as const,
					groupId: 7,
				};
				vi.spyOn(
					GroupExplorerFacade,
					"listGroupMediaRange",
				).mockResolvedValue({
					items:  [],
					offset: 0,
					total:  0,
				});

				const dataSource = createGroupMediaWallDataSource(group);

				await dataSource.loadRange({
					offset: 10,
					limit:  20,
					search: "eva",
				});

				expect(GroupExplorerFacade.listGroupMediaRange).toHaveBeenCalledWith({
					offset: 10,
					limit:  20,
					search: "eva",
					group,
				});
			},
		);
	},
);
