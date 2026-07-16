// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const groupMediaItemsPatchedNext = vi.fn();
const groupMediaListChangedNext  = vi.fn();
const mediaOverrideGet           = vi.fn();
const mediaOverrideSave          = vi.fn();
const mediaOverrideDelete        = vi.fn();
const mediaGetDetailsSnapshot = vi.fn();
const mediaUpdateDetails      = vi.fn();
const isAdminModeEnabled      = vi.fn();
const getSelectionSnapshot       = vi.fn();
const applyMediaSelections       = vi.fn();
const logMainServiceError        = vi.fn();
const toasterError               = vi.fn();

vi.mock(
	"@nimlat/busses/main",
	() => ({
		BUS_GroupMediaItemsPatched: {
			next: groupMediaItemsPatchedNext,
		},
		BUS_GroupMediaListChanged:  {
			next: groupMediaListChangedNext,
		},
	}),
);

vi.mock(
	"@nimlat/database",
	() => ({
		AnimeDbFacade:      {
			media: {
				getDetailsSnapshot: mediaGetDetailsSnapshot,
				updateDetails:      mediaUpdateDetails,
			},
		},
		ImageCacheDbFacade: {
			getUserLocalImage: vi.fn(),
		},
		UserDbFacade:       {
			config: {
				isAdminModeEnabled,
			},
			overrides: {
				media: {
					get:    mediaOverrideGet,
					save:   mediaOverrideSave,
					delete: mediaOverrideDelete,
				},
			},
		},
	}),
);

vi.mock(
	"@nimlat/loggers/main",
	() => ({
		LoggerUtils: {
			logMainServiceError,
		},
	}),
);

vi.mock(
	"../../utils/toaster",
	() => ({
		Toaster: {
			error: toasterError,
		},
	}),
);

vi.mock(
	"../group/group-image-storage-service",
	() => ({
		deleteOwnedMediaImageIfPresent: vi.fn(),
	}),
);

vi.mock(
	"../image-cache/image-cache-service",
	() => ({
		ImageCacheService: {
			deleteMediaUserLocalImage: vi.fn(),
		},
	}),
);

vi.mock(
	"../image-cache/image-gallery-service",
	() => ({
		ImageGalleryService: {
			getMediaSelectionSnapshot: getSelectionSnapshot,
			applyMediaSelections,
			resetMediaSelections:      vi.fn(),
		},
	}),
);

describe(
	"MediaEditService",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			isAdminModeEnabled.mockReturnValue(false);
			getSelectionSnapshot.mockReturnValue([
				{
					role:         "banner",
					candidateKey: "provider:old-banner",
				},
			]);
		});

		it(
			"restores the previous media override when image selection persistence fails",
			async () => {
				const previousOverride = {
					mediaId:        12,
					name:           "Previous",
					description:    "Previous description",
					customImageUrl: null,
					updatedAt:      100,
				};
				mediaOverrideGet.mockReturnValue(previousOverride);
				applyMediaSelections
					.mockImplementationOnce(() => {
						throw new Error("selection failed");
					})
					.mockImplementationOnce(() => undefined);

				const { MediaEditService } = await import("./media-edit-service");
				const result               = MediaEditService.saveEdit({
					mediaId:     12,
					name:        "New",
					description: "New description",
					selections:  [
						{
							role:         "banner",
							candidateKey: "upload:3",
						},
					],
				});

				expect(result.success).toBe(false);
				expect(mediaOverrideSave).toHaveBeenNthCalledWith(
					1,
					expect.objectContaining({
						mediaId: 12,
						name:    "New",
					}),
				);
				expect(mediaOverrideSave).toHaveBeenNthCalledWith(
					2,
					previousOverride,
				);
				expect(applyMediaSelections).toHaveBeenLastCalledWith(
					12,
					[
						{
							role:         "banner",
							candidateKey: "provider:old-banner",
						},
					],
				);
				expect(groupMediaItemsPatchedNext).not.toHaveBeenCalled();
				expect(groupMediaListChangedNext).not.toHaveBeenCalled();
			},
		);

		it(
			"saves media edits to AnimeDB in admin mode",
			async () => {
				isAdminModeEnabled.mockReturnValue(true);
				mediaGetDetailsSnapshot.mockReturnValue({
					mediaId:     12,
					name:        "Old official",
					description: "Old description",
				});

				const { MediaEditService } = await import("./media-edit-service");
				const result               = MediaEditService.saveEdit({
					mediaId:     12,
					name:        "Curated media",
					description: "Official media description",
					selections:  [],
				});

				expect(result.success).toBe(true);
				expect(mediaUpdateDetails).toHaveBeenCalledWith(
					12,
					{
						name:        "Curated media",
						description: "Official media description",
					},
				);
				expect(mediaOverrideSave).not.toHaveBeenCalled();
			},
		);

		it(
			"resets media details from a compact AnimeDB snapshot",
			async () => {
				mediaGetDetailsSnapshot.mockReturnValue({
					mediaId:     12,
					name:        "Official media",
					description: "Official description",
					imageUrl:    "https://img.example.test/official.jpg",
				});

				const { MediaEditService } = await import("./media-edit-service");
				const result               = MediaEditService.resetDetails({ mediaId: 12 });

				expect(result).toEqual({ success: true });
				expect(mediaOverrideDelete).toHaveBeenCalledWith(12);
				expect(mediaGetDetailsSnapshot).toHaveBeenCalledWith(12);
				expect(groupMediaItemsPatchedNext).toHaveBeenCalledWith({
					patches: [
						{
							mediaId:            12,
							name:               "Official media",
							description:        "Official description",
							imageUrl:           "https://img.example.test/official.jpg",
							displayImageUrl:    undefined,
							displayImageSource: undefined,
						},
					],
				});
				expect(groupMediaListChangedNext).toHaveBeenCalledWith({
					affectedMediaIds: [ 12 ],
				});
			},
		);
	},
);
