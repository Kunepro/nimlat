// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const userGroupingGetState  = vi.fn();
const userListExplorerCards = vi.fn();
const userGetInspectionSummary  = vi.fn();
const userListMediaCardsRange   = vi.fn();
const userGetMediaIds       = vi.fn();
const userGetLastRefreshAt  = vi.fn();
const userGetBaseMediaId    = vi.fn();
const userIsOfficialGroupHidden = vi.fn();
const isAdminModeEnabled = vi.fn();

const animeListExplorerCards = vi.fn();
const animeGetInspectionSummary = vi.fn();
const animeListMediaCardsRange  = vi.fn();
const animeGetMediaIds       = vi.fn();
const animeGetLastRefreshAt  = vi.fn();
const animeGetBaseMediaId    = vi.fn();

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade:  {
			config: {
				isAdminModeEnabled,
			},
			grouping: {
				getState:             userGroupingGetState,
				listExplorerCards:    userListExplorerCards,
				getInspectionSummary: userGetInspectionSummary,
				listMediaCardsRange:  userListMediaCardsRange,
				getMediaIds:          userGetMediaIds,
				getLastRefreshAt:     userGetLastRefreshAt,
				getBaseMediaId:       userGetBaseMediaId,
				isOfficialGroupHidden: userIsOfficialGroupHidden,
			},
		},
		AnimeDbFacade: {
			group: {
				listExplorerCards: animeListExplorerCards,
				getInspectionSummary: animeGetInspectionSummary,
				listMediaCardsRange:  animeListMediaCardsRange,
				getMediaIds:       animeGetMediaIds,
				getLastRefreshAt:  animeGetLastRefreshAt,
				getBaseMediaId:    animeGetBaseMediaId,
			},
		},
	}),
);

describe(
	"GroupReadRepository",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			isAdminModeEnabled.mockReturnValue(false);
			userIsOfficialGroupHidden.mockReturnValue(false);
		});

		it(
			"reads from anime-mode facades when grouping mode is anime",
			async () => {
				userGroupingGetState.mockReturnValue({ groupingMode: "anime" });
				animeListExplorerCards.mockReturnValue({
					cards: [ { id: 1 } ],
					total: 1,
				});
				animeGetInspectionSummary.mockReturnValue({
					id:                 5,
					mediasCount:        0,
					watchedMediasCount: 0,
				});
				animeListMediaCardsRange.mockReturnValue({
					offset: 5,
					total:  1,
					items:  [ { mediaId: 12 } ],
				});
				animeGetMediaIds.mockReturnValue([
					7,
					8,
				]);
				animeGetLastRefreshAt.mockReturnValue(123);
				animeGetBaseMediaId.mockReturnValue(99);

				const { GroupReadRepository } = await import("./group-read-repository");

				expect(GroupReadRepository.listExplorerCards(
					0,
					20,
					"abc",
				)).toEqual({
					cards: [ { id: 1 } ],
					total: 1,
				});
				expect(GroupReadRepository.getInspectionSummaryByRef({
					source:  "official",
					groupId: 5,
				})).toEqual({
					id:                 5,
					mediasCount:        0,
					watchedMediasCount: 0,
				});
				expect(GroupReadRepository.listMediaCardsRangeByRef(
					{
						source:  "official",
						groupId: 5,
					},
					5,
					10,
					"abc",
				)).toEqual({
					offset: 5,
					total:  1,
					items:  [ { mediaId: 12 } ],
				});
				expect(GroupReadRepository.getMediaIds(5)).toEqual([
					7,
					8,
				]);
				expect(GroupReadRepository.getLastRefreshAt(5)).toBe(123);
				expect(GroupReadRepository.getBaseMediaId(5)).toBe(99);

				expect(animeListExplorerCards).toHaveBeenCalledWith(
					0,
					20,
					"abc",
				);
				expect(animeGetInspectionSummary).toHaveBeenCalledWith(5);
				expect(animeListMediaCardsRange).toHaveBeenCalledWith(
					5,
					5,
					10,
					"abc",
				);
				expect(animeGetMediaIds).toHaveBeenCalledWith(5);
				expect(animeGetLastRefreshAt).toHaveBeenCalledWith(5);
				expect(animeGetBaseMediaId).toHaveBeenCalledWith(5);
				expect(userListExplorerCards).not.toHaveBeenCalled();
			},
		);

		it(
			"reads from user snapshot facades when grouping mode is user",
			async () => {
				userGroupingGetState.mockReturnValue({ groupingMode: "user" });
				userListExplorerCards.mockReturnValue({
					cards: [ { id: 2 } ],
					total: 1,
				});
				userGetInspectionSummary.mockReturnValue({
					id:                 8,
					mediasCount:        1,
					watchedMediasCount: 1,
				});
				userListMediaCardsRange.mockReturnValue({
					offset: 10,
					total:  1,
					items:  [ { mediaId: 91 } ],
				});
				userGetMediaIds.mockReturnValue([ 91 ]);
				userGetLastRefreshAt.mockReturnValue(456);
				userGetBaseMediaId.mockReturnValue(77);

				const { GroupReadRepository } = await import("./group-read-repository");

				expect(GroupReadRepository.listExplorerCards(
					10,
					10,
					"user",
				)).toEqual({
					cards: [ { id: 2 } ],
					total: 1,
				});
				expect(GroupReadRepository.getInspectionSummaryByRef({
					source:  "user",
					groupId: 8,
				})).toEqual({
					id:                 8,
					mediasCount:        1,
					watchedMediasCount: 1,
				});
				expect(GroupReadRepository.listMediaCardsRangeByRef(
					{
						source:  "user",
						groupId: 8,
					},
					10,
					10,
					"user",
				)).toEqual({
					offset: 10,
					total:  1,
					items:  [ { mediaId: 91 } ],
				});
				expect(GroupReadRepository.getMediaIds(8)).toEqual([ 91 ]);
				expect(GroupReadRepository.getLastRefreshAt(8)).toBe(456);
				expect(GroupReadRepository.getBaseMediaId(8)).toBe(77);

				expect(userListExplorerCards).toHaveBeenCalledWith(
					10,
					10,
					"user",
				);
				expect(userGetInspectionSummary).toHaveBeenCalledWith(8);
				expect(userListMediaCardsRange).toHaveBeenCalledWith(
					8,
					10,
					10,
					"user",
				);
				expect(userGetMediaIds).toHaveBeenCalledWith(8);
				expect(userGetLastRefreshAt).toHaveBeenCalledWith(8);
				expect(userGetBaseMediaId).toHaveBeenCalledWith(8);
				expect(animeListExplorerCards).not.toHaveBeenCalled();
			},
		);

		it(
			"returns no official group reads when the official group is hidden",
			async () => {
				userIsOfficialGroupHidden.mockReturnValue(true);

				const { GroupReadRepository } = await import("./group-read-repository");
				const hiddenGroup             = {
					source:  "official" as const,
					groupId: 77,
				};

				expect(GroupReadRepository.getInspectionSummaryByRef(hiddenGroup)).toBeNull();
				expect(GroupReadRepository.listMediaCardsRangeByRef(
					hiddenGroup,
					20,
					10,
					"hidden",
				)).toEqual({
					offset: 20,
					total:  0,
					items:  [],
				});
				expect(GroupReadRepository.getMediaIdsByRef(hiddenGroup)).toEqual([]);
				expect(GroupReadRepository.getLastRefreshAtByRef(hiddenGroup)).toBeUndefined();
				expect(animeGetInspectionSummary).not.toHaveBeenCalled();
				expect(animeListMediaCardsRange).not.toHaveBeenCalled();
				expect(animeGetMediaIds).not.toHaveBeenCalled();
				expect(animeGetLastRefreshAt).not.toHaveBeenCalled();
			},
		);

		it(
			"prefers official reads in admin mode even when a user snapshot exists",
			async () => {
				isAdminModeEnabled.mockReturnValue(true);
				userGroupingGetState.mockReturnValue({ groupingMode: "user" });
				animeListExplorerCards.mockReturnValue({
					cards: [ { id: 3 } ],
					total: 1,
				});

				const { GroupReadRepository } = await import("./group-read-repository");

				expect(GroupReadRepository.listExplorerCards(
					0,
					20,
					"",
				)).toEqual({
					cards: [ { id: 3 } ],
					total: 1,
				});
				expect(animeListExplorerCards).toHaveBeenCalledWith(
					0,
					20,
					"",
				);
				expect(userListExplorerCards).not.toHaveBeenCalled();
			},
		);
	},
);
