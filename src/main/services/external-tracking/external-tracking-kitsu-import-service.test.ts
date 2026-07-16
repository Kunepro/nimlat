// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
	importFromLoader:    vi.fn(),
	importPublicProfile: vi.fn(),
	readFile:            vi.fn(),
	showOpenDialog:      vi.fn(),
	stat:                vi.fn(),
}));

vi.mock(
	"electron",
	() => ({ dialog: { showOpenDialog: mocks.showOpenDialog } }),
);

vi.mock(
	"node:fs/promises",
	() => ({
		readFile: mocks.readFile,
		stat:     mocks.stat,
	}),
);

vi.mock(
	"./external-tracking-import-service",
	() => ({ importExternalTrackingFromLoader: mocks.importFromLoader }),
);

vi.mock(
	"./external-tracking-kitsu-client",
	() => ({
		KitsuTrackingClient: class {
			importPublicProfile = mocks.importPublicProfile;
		},
	}),
);

describe(
	"external-tracking-kitsu-import-service",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"forwards the normalized public identifier to the import transaction",
			async () => {
				mocks.importFromLoader.mockResolvedValue({
					success:           true,
					message:           "ok",
					importedItems:     1,
					matchedItems:      1,
					localUpdatedItems: 1,
				});
				const { importKitsuPublicProfile } = await import("./external-tracking-kitsu-import-service");

				await importKitsuPublicProfile({
					provider: "kitsu",
					username: "  Dzhalagash  ",
				});

				expect(mocks.importFromLoader).toHaveBeenCalledWith(
					"kitsu",
					expect.any(Function),
					"external-tracking.importKitsuPublicProfile",
					{ publicProfileIdentifier: "Dzhalagash" },
				);
			},
		);

		it(
			"returns a non-error cancellation result without reading a file",
			async () => {
				mocks.showOpenDialog.mockResolvedValue({
					canceled:  true,
					filePaths: [],
				});
				const { importKitsuXmlFile } = await import("./external-tracking-kitsu-import-service");

				await expect(importKitsuXmlFile()).resolves.toMatchObject({
					success: false,
					message: "Kitsu XML import cancelled.",
				});
				expect(mocks.readFile).not.toHaveBeenCalled();
			},
		);

		it(
			"reads the selected bounded XML and forwards MAL ids without a fake Kitsu id",
			async () => {
				mocks.showOpenDialog.mockResolvedValue({
					canceled:  false,
					filePaths: [ "C:\\exports\\kitsu.xml" ],
				});
				mocks.stat.mockResolvedValue({
					isFile: () => true,
					size:   2_000,
				});
				mocks.readFile.mockResolvedValue(`
					<myanimelist><anime>
						<series_animedb_id>1535</series_animedb_id>
						<my_watched_episodes>37</my_watched_episodes>
						<my_status>Completed</my_status>
					</anime></myanimelist>
				`);
				mocks.importFromLoader.mockImplementation(async (_provider, loadItems) => ({
					success:           true,
					message:           "ok",
					importedItems:     (await loadItems()).length,
					matchedItems:      1,
					localUpdatedItems: 1,
				}));
				const { importKitsuXmlFile } = await import("./external-tracking-kitsu-import-service");

				await expect(importKitsuXmlFile()).resolves.toMatchObject({ importedItems: 1 });
				const loadItems = mocks.importFromLoader.mock.calls[ 0 ]?.[ 1 ] as () => Promise<unknown[]>;
				await expect(loadItems()).resolves.toEqual([
					expect.objectContaining({
						providerMediaId: null,
						idMal:           1535,
					}),
				]);
			},
		);
	},
);
