// @vitest-environment node
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";
import type { UserIntegrationCascadeRepository } from "./user-integration-cascade-repository";
import { UserIntegrationSnapshotRecomputer } from "./user-integration-snapshot-recomputer";

interface FakeRepository {
	getEpisodeStateRow: ReturnType<typeof vi.fn>;
	getMediaStateRow: ReturnType<typeof vi.fn>;
	countEpisodePlaybackIssueMoments: ReturnType<typeof vi.fn>;
	countMediaPlaybackIssueMoments: ReturnType<typeof vi.fn>;
	upsertEpisodeIntegrationSnapshot: ReturnType<typeof vi.fn>;
	getEpisodeIntegrationPercentsByMediaId: ReturnType<typeof vi.fn>;
	upsertMediaIntegrationSnapshot: ReturnType<typeof vi.fn>;
	getMediaIntegrationPercentsByGroupId: ReturnType<typeof vi.fn>;
	getMediaIntegrationStatusesByGroupId: ReturnType<typeof vi.fn>;
	upsertGroupIntegrationSnapshot: ReturnType<typeof vi.fn>;
	upsertGroupStateRow: ReturnType<typeof vi.fn>;
	getGroupIdsByMediaId: ReturnType<typeof vi.fn>;
	getEpisodeIntegrationStatusesByMediaId: ReturnType<typeof vi.fn>;
	upsertMediaStateRow: ReturnType<typeof vi.fn>;
	getEpisodeNumbersByMediaId: ReturnType<typeof vi.fn>;
	upsertEpisodeStateRow: ReturnType<typeof vi.fn>;
	groupExists: ReturnType<typeof vi.fn>;
}

function integrationState(integrationStatus: IntegrationStatus | null, overrides: Record<string, unknown> = {}) {
	return {
		integrationStatus,
		playbackIssueNote: null,
		hasDubIssue:       0,
		hasSubIssue:       0,
		hasEncodingIssue:  0,
		hasAudioIssue:     0,
		hasVideoIssue:     0,
		...overrides,
	};
}

function createFakeRepository(overrides: Partial<FakeRepository> = {}): FakeRepository {
	return {
		getEpisodeStateRow:                     vi.fn(() => integrationState(null)),
		getMediaStateRow:                       vi.fn(() => integrationState(null)),
		countEpisodePlaybackIssueMoments:       vi.fn(() => 0),
		countMediaPlaybackIssueMoments:         vi.fn(() => 0),
		upsertEpisodeIntegrationSnapshot:       vi.fn(),
		getEpisodeIntegrationPercentsByMediaId: vi.fn(() => []),
		upsertMediaIntegrationSnapshot:         vi.fn(),
		getMediaIntegrationPercentsByGroupId:   vi.fn(() => []),
		getMediaIntegrationStatusesByGroupId:   vi.fn(() => []),
		upsertGroupIntegrationSnapshot:         vi.fn(),
		upsertGroupStateRow:                    vi.fn(),
		getGroupIdsByMediaId:                   vi.fn(() => []),
		getEpisodeIntegrationStatusesByMediaId: vi.fn(() => []),
		upsertMediaStateRow:                    vi.fn(),
		getEpisodeNumbersByMediaId:             vi.fn(() => []),
		upsertEpisodeStateRow:                  vi.fn(),
		groupExists:                            vi.fn(() => true),
		...overrides,
	};
}

function createRecomputer(repository: FakeRepository): UserIntegrationSnapshotRecomputer {
	return new UserIntegrationSnapshotRecomputer(repository as unknown as UserIntegrationCascadeRepository);
}

describe(
	"UserIntegrationSnapshotRecomputer",
	() => {
		it(
			"caps episode progress when playback issues exist",
			() => {
				const repository = createFakeRepository({
					getEpisodeStateRow: vi.fn(() => integrationState(
						"integrated",
						{ hasSubIssue: 1 },
					)),
				});
				const recomputer = createRecomputer(repository);

				const percent = recomputer.recomputeEpisodeIntegration(
					10,
					2,
					1_000,
				);

				expect(percent).toBe(70);
				expect(repository.upsertEpisodeIntegrationSnapshot).toHaveBeenCalledWith(
					10,
					2,
					70,
					1_000,
				);
			},
		);

		it(
			"syncs the parent media status from effective episode statuses without changing issue flags",
			() => {
				const repository = createFakeRepository({
					getMediaStateRow:                       vi.fn(() => integrationState(
						null,
						{
							playbackIssueNote: "needs remux",
							hasAudioIssue:     1,
						},
					)),
					getEpisodeIntegrationStatusesByMediaId: vi.fn(() => [
						"downloaded",
						"tracked",
						null,
					]),
				});
				const recomputer = createRecomputer(repository);

				recomputer.syncMediaStatusFromEpisodeStates(
					44,
					2_000,
				);

				expect(repository.upsertMediaStateRow).toHaveBeenCalledWith({
					mediaId:           44,
					integrationStatus: "tracked",
					playbackIssueNote: "needs remux",
					hasDubIssue:       0,
					hasSubIssue:       0,
					hasEncodingIssue:  0,
					hasAudioIssue:     1,
					hasVideoIssue:     0,
					updatedAt:         2_000,
				});
			},
		);

		it(
			"dedupes affected medias and recomputes parent anime/user groups after media snapshots",
			() => {
				const repository = createFakeRepository({
					getEpisodeIntegrationPercentsByMediaId: vi.fn((mediaId: number) => mediaId === 10
						? [ 100 ]
						: [ 50 ]),
					getGroupIdsByMediaId:                   vi.fn((
						mediaId: number,
						groupingMode: string,
					) => {
						if (groupingMode === "anime") {
							return mediaId === 10 ? [ 1 ] : [
								1,
								2,
							];
						}

						return [ 7 ];
					}),
					getMediaIntegrationPercentsByGroupId:   vi.fn(() => [
						100,
						50,
					]),
					getMediaIntegrationStatusesByGroupId:   vi.fn(() => [
						"downloaded",
						"tracked",
					]),
				});
				const recomputer = createRecomputer(repository);

				const result = recomputer.recomputeCascadeForMediaIds(
					[
						10,
						10,
						20,
					],
					3_000,
				);

				expect(result).toEqual({
					affectedMediaIds: [
						10,
						20,
					],
					affectedGroups:   [
						{
							source:  "official",
							groupId: 1,
						},
						{
							source:  "official",
							groupId: 2,
						},
						{
							source:  "user",
							groupId: 7,
						},
					],
				});
				expect(repository.upsertMediaIntegrationSnapshot).toHaveBeenCalledWith(
					10,
					100,
					3_000,
				);
				expect(repository.upsertMediaIntegrationSnapshot).toHaveBeenCalledWith(
					20,
					50,
					3_000,
				);
				expect(repository.upsertGroupIntegrationSnapshot).toHaveBeenCalledWith(
					1,
					75,
					3_000,
					"anime",
				);
				expect(repository.upsertGroupStateRow).toHaveBeenCalledWith(
					7,
					"tracked",
					3_000,
					"user",
				);
			},
		);
	},
);
