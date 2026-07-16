// @vitest-environment node
import type { Database as SqliteDatabase } from "better-sqlite3";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	recomputeGroupIntegrationSnapshotsForGroupRefs,
	resolveGroupIntegrationStatusFromMediaStatuses,
	resolveMediaIntegrationStatusFromEpisodeStatuses,
	setEpisodeIntegrationStatusAndCascade,
	setGroupRefIntegrationStatusAndCascade,
	setMediaIntegrationStatusAndCascade,
} from "./user-integration-state";

const {
				getDatabaseMock,
				resolveEpisodeIdMock,
			} = vi.hoisted(() => ({
	getDatabaseMock:      vi.fn(),
	resolveEpisodeIdMock: vi.fn(),
}));

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

vi.mock(
	"../../anime/canonical/canonical-id-resolution",
	() => ({
		resolveOrSeedCanonicalEpisodeIdByLegacyKey: resolveEpisodeIdMock,
	}),
);

type EpisodeRow = {
	episodeId: number;
	mediaId: number;
	episodeNumber: number;
};

type GroupMediaRow = {
	groupId: number;
	mediaId: number;
};

type StoredIntegrationState = {
	integrationStatus: string | null;
	playbackIssueNote: string | null;
	hasDubIssue: number;
	hasSubIssue: number;
	hasEncodingIssue: number;
	hasAudioIssue: number;
	hasVideoIssue: number;
	updatedAt: number;
};

type MockIntegrationState = {
	episodes: EpisodeRow[];
	animeGroupMedias: GroupMediaRow[];
	userGroupMedias: GroupMediaRow[];
	animeGroupIds: Set<number>;
	userGroupIds: Set<number>;
	episodeStates: Map<number, StoredIntegrationState>;
	mediaStates: Map<number, StoredIntegrationState>;
	episodeSnapshots: Map<number, number | null>;
	mediaSnapshots: Map<number, number | null>;
	animeGroupStates: Map<number, string | null>;
	customGroupStates: Map<number, string | null>;
	animeGroupSnapshots: Map<number, number | null>;
	customGroupSnapshots: Map<number, number | null>;
};

type MockIntegrationDb = SqliteDatabase & {
	state: MockIntegrationState;
};

function createStoredIntegrationState(
	integrationStatus: string | null,
	updatedAt: number,
): StoredIntegrationState {
	return {
		integrationStatus,
		playbackIssueNote: null,
		hasDubIssue:       0,
		hasSubIssue:       0,
		hasEncodingIssue:  0,
		hasAudioIssue:     0,
		hasVideoIssue:     0,
		updatedAt,
	};
}

function createIntegrationCascadeDb(): MockIntegrationDb {
	const state: MockIntegrationState = {
		episodes:             [],
		animeGroupMedias:     [],
		userGroupMedias:      [],
		animeGroupIds:        new Set(),
		userGroupIds:         new Set(),
		episodeStates:        new Map(),
		mediaStates:          new Map(),
		episodeSnapshots:     new Map(),
		mediaSnapshots:       new Map(),
		animeGroupStates:     new Map(),
		customGroupStates:    new Map(),
		animeGroupSnapshots:  new Map(),
		customGroupSnapshots: new Map(),
	};

	const db = {
		state,
		close:       vi.fn(),
		transaction: vi.fn((callback: () => unknown) => () => callback()),
		prepare:     vi.fn((statement: string) => createIntegrationStatement(
			statement,
			state,
		)),
	} as unknown as MockIntegrationDb;

	return db;
}

function createIntegrationStatement(statement: string, state: MockIntegrationState) {
	if (statement.includes("FROM anime_data.groups") && statement.includes("COUNT(*) AS total")) {
		return {
			get: vi.fn((groupId: number) => ({
				total: state.animeGroupIds.has(groupId) ? 1 : 0,
			})),
		};
	}

	if (statement.includes("FROM userGroups") && statement.includes("COUNT(*) AS total")) {
		return {
			get: vi.fn((groupId: number) => ({
				total: state.userGroupIds.has(groupId) ? 1 : 0,
			})),
		};
	}

	if (statement.includes("SELECT integrationStatus,") && statement.includes("FROM userEpisodeStates")) {
		return {
			get: vi.fn((episodeId: number) => state.episodeStates.get(episodeId)),
		};
	}

	if (statement.includes("INSERT INTO userEpisodeStates")) {
		return {
			run: vi.fn((
				episodeId: number,
				integrationStatus: string | null,
				playbackIssueNote: string | null,
				hasDubIssue: number,
				hasSubIssue: number,
				hasEncodingIssue: number,
				hasAudioIssue: number,
				hasVideoIssue: number,
				updatedAt: number,
			) => {
				state.episodeStates.set(
					episodeId,
					{
						integrationStatus,
						playbackIssueNote,
						hasDubIssue,
						hasSubIssue,
						hasEncodingIssue,
						hasAudioIssue,
						hasVideoIssue,
						updatedAt,
					},
				);
			}),
		};
	}

	if (statement.includes("INSERT INTO userEpisodeIntegrationSnapshots")) {
		return {
			run: vi.fn((episodeId: number, integrationPercent: number | null) => {
				state.episodeSnapshots.set(
					episodeId,
					integrationPercent,
				);
			}),
		};
	}

	if (statement.includes("FROM userEpisodePlaybackIssueMoments") && statement.includes("COUNT(*)")) {
		return {
			get: vi.fn(() => ({ total: 0 })),
		};
	}

	if (
		statement.includes("DELETE") && statement.includes("FROM userEpisodePlaybackIssueMoments")
		|| statement.includes("INSERT INTO userEpisodePlaybackIssueMoments")
		|| statement.includes("DELETE") && statement.includes("FROM userMediaPlaybackIssueMoments")
		|| statement.includes("INSERT INTO userMediaPlaybackIssueMoments")
	) {
		return {
			run: vi.fn(),
		};
	}

	if (statement.includes("SELECT integrationStatus,") && statement.includes("FROM userMediaStates")) {
		return {
			get: vi.fn((mediaId: number) => state.mediaStates.get(mediaId)),
		};
	}

	if (statement.includes("INSERT INTO userMediaStates")) {
		return {
			run: vi.fn((
				mediaId: number,
				integrationStatus: string | null,
				playbackIssueNote: string | null,
				hasDubIssue: number,
				hasSubIssue: number,
				hasEncodingIssue: number,
				hasAudioIssue: number,
				hasVideoIssue: number,
				updatedAt: number,
			) => {
				state.mediaStates.set(
					mediaId,
					{
						integrationStatus,
						playbackIssueNote,
						hasDubIssue,
						hasSubIssue,
						hasEncodingIssue,
						hasAudioIssue,
						hasVideoIssue,
						updatedAt,
					},
				);
			}),
		};
	}

	if (statement.includes("INSERT INTO userMediaIntegrationSnapshots")) {
		return {
			run: vi.fn((mediaId: number, integrationPercent: number | null) => {
				state.mediaSnapshots.set(
					mediaId,
					integrationPercent,
				);
			}),
		};
	}

	if (statement.includes("FROM userMediaPlaybackIssueMoments") && statement.includes("COUNT(*)")) {
		return {
			get: vi.fn(() => ({ total: 0 })),
		};
	}

	if (statement.includes("INSERT INTO userAnimeGroupStates")) {
		return {
			run: vi.fn((groupId: number, integrationStatus: string | null) => {
				state.animeGroupStates.set(
					groupId,
					integrationStatus,
				);
			}),
		};
	}

	if (statement.includes("INSERT INTO userCustomGroupStates")) {
		return {
			run: vi.fn((groupId: number, integrationStatus: string | null) => {
				state.customGroupStates.set(
					groupId,
					integrationStatus,
				);
			}),
		};
	}

	if (statement.includes("INSERT INTO userAnimeGroupIntegrationSnapshots")) {
		return {
			run: vi.fn((groupId: number, integrationPercent: number | null) => {
				state.animeGroupSnapshots.set(
					groupId,
					integrationPercent,
				);
			}),
		};
	}

	if (statement.includes("INSERT INTO userCustomGroupIntegrationSnapshots")) {
		return {
			run: vi.fn((groupId: number, integrationPercent: number | null) => {
				state.customGroupSnapshots.set(
					groupId,
					integrationPercent,
				);
			}),
		};
	}

	if (statement.includes("SELECT episodeNumber") && statement.includes("FROM anime_data.episodes")) {
		return {
			all: vi.fn((mediaId: number) => state.episodes
				.filter(episode => episode.mediaId === mediaId)
				.map(episode => ({ episodeNumber: episode.episodeNumber }))),
		};
	}

	if (statement.includes("SELECT DISTINCT groupId") && statement.includes("FROM anime_data.groupMedia")) {
		return {
			all: vi.fn((mediaId: number) => state.animeGroupMedias
				.filter(row => row.mediaId === mediaId)
				.map(row => ({ groupId: row.groupId }))),
		};
	}

	if (statement.includes("SELECT DISTINCT userGroupMedias.groupId AS groupId")) {
		return {
			all: vi.fn((mediaId: number) => state.userGroupMedias
				.filter(row => row.mediaId === mediaId)
				.map(row => ({ groupId: row.groupId }))),
		};
	}

	if (statement.includes("SELECT DISTINCT mediaId") && statement.includes("FROM anime_data.groupMedia")) {
		return {
			all: vi.fn((groupId: number) => state.animeGroupMedias
				.filter(row => row.groupId === groupId)
				.map(row => ({ mediaId: row.mediaId }))),
		};
	}

	if (statement.includes("SELECT DISTINCT mediaId") && statement.includes("FROM userGroupMedias")) {
		return {
			all: vi.fn((groupId: number) => state.userGroupMedias
				.filter(row => row.groupId === groupId)
				.map(row => ({ mediaId: row.mediaId }))),
		};
	}

	if (statement.includes("LEFT JOIN userEpisodeIntegrationSnapshots")) {
		return {
			all: vi.fn((mediaId: number) => state.episodes
				.filter(episode => episode.mediaId === mediaId)
				.map(episode => ({
					integrationPercent: state.episodeSnapshots.get(episode.episodeId) ?? null,
				}))),
		};
	}

	if (statement.includes("LEFT JOIN userEpisodeStates")) {
		return {
			all: vi.fn((mediaId: number) => state.episodes
				.filter(episode => episode.mediaId === mediaId)
				.map(episode => ({
					integrationStatus: state.episodeStates.get(episode.episodeId)?.integrationStatus ?? null,
				}))),
		};
	}

	if (statement.includes("FROM anime_data.groupMedia groupMedia") && statement.includes("LEFT JOIN userMediaIntegrationSnapshots")) {
		return {
			all: vi.fn((groupId: number) => state.animeGroupMedias
				.filter(row => row.groupId === groupId)
				.map(row => ({
					integrationPercent: state.mediaSnapshots.get(row.mediaId) ?? null,
				}))),
		};
	}

	if (statement.includes("FROM userGroupMedias") && statement.includes("LEFT JOIN userMediaIntegrationSnapshots")) {
		return {
			all: vi.fn((groupId: number) => state.userGroupMedias
				.filter(row => row.groupId === groupId)
				.map(row => ({
					integrationPercent: state.mediaSnapshots.get(row.mediaId) ?? null,
				}))),
		};
	}

	if (statement.includes("FROM anime_data.groupMedia groupMedia") && statement.includes("LEFT JOIN userMediaStates")) {
		return {
			all: vi.fn((groupId: number) => state.animeGroupMedias
				.filter(row => row.groupId === groupId)
				.map(row => ({
					integrationStatus: state.mediaStates.get(row.mediaId)?.integrationStatus ?? null,
				}))),
		};
	}

	if (statement.includes("FROM userGroupMedias") && statement.includes("LEFT JOIN userMediaStates")) {
		return {
			all: vi.fn((groupId: number) => state.userGroupMedias
				.filter(row => row.groupId === groupId)
				.map(row => ({
					integrationStatus: state.mediaStates.get(row.mediaId)?.integrationStatus ?? null,
				}))),
		};
	}

	throw new Error(`Unexpected SQL in user integration cascade test: ${ statement }`);
}

function seedEpisode(db: MockIntegrationDb, mediaId: number, episodeNumber: number): void {
	db.state.episodes.push({
		episodeId: mediaId * 1000 + episodeNumber,
		mediaId,
		episodeNumber,
	});
}

function seedAnimeGroupMedia(db: MockIntegrationDb, groupId: number, mediaIds: number[]): void {
	db.state.animeGroupIds.add(groupId);
	mediaIds.forEach((mediaId) => {
		db.state.animeGroupMedias.push({
			groupId,
			mediaId,
		});
	});
}

function seedUserGroupMedia(db: MockIntegrationDb, groupId: number, mediaIds: number[]): void {
	db.state.userGroupIds.add(groupId);
	mediaIds.forEach((mediaId) => {
		db.state.userGroupMedias.push({
			groupId,
			mediaId,
		});
	});
}

function seedMediaState(
	db: MockIntegrationDb,
	mediaId: number,
	integrationStatus: string | null,
	updatedAt: number = 1,
): void {
	db.state.mediaStates.set(
		mediaId,
		createStoredIntegrationState(
			integrationStatus,
			updatedAt,
		),
	);
}

beforeEach(() => {
	vi.clearAllMocks();
	resolveEpisodeIdMock.mockImplementation((
		_db: SqliteDatabase,
		mediaId: number,
		episodeNumber: number,
	) => mediaId * 1000 + episodeNumber);
});

describe(
	"resolveMediaIntegrationStatusFromEpisodeStatuses",
	() => {
		it(
			"promotes media to the only tracked-or-above episode status while ignoring ignored siblings",
			() => {
				expect(resolveMediaIntegrationStatusFromEpisodeStatuses([
					"ignored",
					"ignored",
					"integrated",
				])).toBe("integrated");
			},
		);

		it(
			"uses the lowest tracked-or-above phase as the effective media status",
			() => {
				expect(resolveMediaIntegrationStatusFromEpisodeStatuses([
					null,
					"ignored",
					"integrated",
					"tracked",
					"downloaded",
				])).toBe("tracked");
				expect(resolveMediaIntegrationStatusFromEpisodeStatuses([
					null,
					"ignored",
					"integrated",
					"downloading",
					"downloaded",
				])).toBe("downloading");
			},
		);

		it(
			"preserves all-ignored media and treats untracked-only mixes as untracked",
			() => {
				expect(resolveMediaIntegrationStatusFromEpisodeStatuses([
					"ignored",
					"ignored",
				])).toBe("ignored");
				expect(resolveMediaIntegrationStatusFromEpisodeStatuses([
					"ignored",
					null,
				])).toBeNull();
				expect(resolveMediaIntegrationStatusFromEpisodeStatuses([
					null,
					null,
				])).toBeNull();
			},
		);
	},
);

describe(
	"resolveGroupIntegrationStatusFromMediaStatuses",
	() => {
		it(
			"ignores ignored and untracked media while choosing the lowest active group phase",
			() => {
				expect(resolveGroupIntegrationStatusFromMediaStatuses([
					"ignored",
					null,
					"downloading",
				])).toBe("downloading");
				expect(resolveGroupIntegrationStatusFromMediaStatuses([
					"ignored",
					"integrated",
					"downloaded",
					"tracked",
				])).toBe("tracked");
			},
		);

		it(
			"keeps all-ignored groups ignored and mixed inactive groups untracked",
			() => {
				expect(resolveGroupIntegrationStatusFromMediaStatuses([
					"ignored",
					"ignored",
				])).toBe("ignored");
				expect(resolveGroupIntegrationStatusFromMediaStatuses([
					"ignored",
					null,
				])).toBeNull();
				expect(resolveGroupIntegrationStatusFromMediaStatuses([
					null,
					null,
				])).toBeNull();
			},
		);
	},
);

describe(
	"integration cascade group status",
	() => {
		it(
			"updates the parent group status when an episode edit derives a media status",
			() => {
				const db = createIntegrationCascadeDb();
				try {
					getDatabaseMock.mockReturnValue(db);
					seedAnimeGroupMedia(
						db,
						7,
						[
							10,
							11,
							12,
						],
					);
					seedEpisode(
						db,
						12,
						1,
					);
					seedMediaState(
						db,
						10,
						"ignored",
					);

					setEpisodeIntegrationStatusAndCascade(
						12,
						1,
						"downloading",
					);

					expect(db.state.animeGroupStates.get(7)).toBe("downloading");
				} finally {
					db.close();
				}
			},
		);

		it(
			"updates the parent group status when a media status changes directly",
			() => {
				const db = createIntegrationCascadeDb();
				try {
					getDatabaseMock.mockReturnValue(db);
					seedAnimeGroupMedia(
						db,
						8,
						[
							20,
							21,
							22,
						],
					);
					seedMediaState(
						db,
						20,
						"downloaded",
					);
					seedMediaState(
						db,
						22,
						"ignored",
					);
					db.state.animeGroupStates.set(
						8,
						"downloaded",
					);

					setMediaIntegrationStatusAndCascade(
						21,
						"tracked",
					);

					expect(db.state.animeGroupStates.get(8)).toBe("tracked");
				} finally {
					db.close();
				}
			},
		);
	},
);

describe(
	"setGroupRefIntegrationStatusAndCascade",
	() => {
		it(
			"adapts renderer group refs to the correct persisted grouping mode",
			() => {
				const db = createIntegrationCascadeDb();
				try {
					getDatabaseMock.mockReturnValue(db);
					seedAnimeGroupMedia(
						db,
						8,
						[ 20 ],
					);
					seedUserGroupMedia(
						db,
						51,
						[ 100 ],
					);

					setGroupRefIntegrationStatusAndCascade(
						{
							source:  "official",
							groupId: 8,
						},
						"tracked",
					);
					setGroupRefIntegrationStatusAndCascade(
						{
							source:  "user",
							groupId: 51,
						},
						"integrated",
					);

					expect(db.state.animeGroupStates.get(8)).toBe("tracked");
					expect(db.state.customGroupStates.get(51)).toBe("integrated");
					expect(db.state.customGroupStates.has(8)).toBe(false);
					expect(db.state.animeGroupStates.has(51)).toBe(false);
				} finally {
					db.close();
				}
			},
		);
	},
);

describe(
	"recomputeGroupIntegrationSnapshotsForGroupRefs",
	() => {
		it(
			"refreshes current group status from existing media membership and skips deleted groups",
			() => {
				const db = createIntegrationCascadeDb();
				try {
					getDatabaseMock.mockReturnValue(db);
					seedUserGroupMedia(
						db,
						51,
						[
							100,
							200,
							300,
						],
					);
					seedMediaState(
						db,
						100,
						"ignored",
					);
					seedMediaState(
						db,
						300,
						"downloaded",
					);
					db.state.customGroupStates.set(
						51,
						null,
					);

					recomputeGroupIntegrationSnapshotsForGroupRefs([
						{
							source:  "user",
							groupId: 51,
						},
						{
							source:  "user",
							groupId: 52,
						},
					]);

					expect(db.state.customGroupStates.get(51)).toBe("downloaded");
					expect(db.state.customGroupStates.has(52)).toBe(false);
				} finally {
					db.close();
				}
			},
		);
	},
);
