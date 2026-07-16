// @vitest-environment node
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

type QueueStatus = "pending" | "processing" | "failed";

interface QueueRow {
	mediaId: number;
	status: QueueStatus;
	retryCount: number;
	errorMessage: string | null;
	failureReason: string | null;
	lastTriedAt: number | null;
}

interface PriorityRow {
	mediaId: number;
	priority: number;
	requestedAt: number;
}

const queueRows       = new Map<number, QueueRow>();
const priorityRows    = new Map<number, PriorityRow>();
const getDatabaseMock = vi.fn();

function resetState(): void {
	queueRows.clear();
	priorityRows.clear();
}

function createMockDatabase() {
	// noinspection OverlyComplexFunctionJS
	return {
		transaction: (callback: () => void) => callback,
		prepare:     (sql: string) => {
			if (sql.includes(`INSERT OR IGNORE INTO ${ "anime_data" }.mediaHydrationQueueJikanEpisodes`)) {
				return {
					run: (mediaId: number) => {
						if (!queueRows.has(mediaId)) {
							queueRows.set(
								mediaId,
								{
									mediaId,
									status:        "pending",
									retryCount:    0,
									errorMessage:  null,
									failureReason: null,
									lastTriedAt:   null,
								},
							);
						}
					},
				};
			}

			if (sql.includes("SELECT status") && sql.includes("FROM anime_data.mediaHydrationQueueJikanEpisodes")) {
				return {
					get: (mediaId: number) => {
						const row = queueRows.get(mediaId);
						return row
							? { status: row.status }
							: undefined;
					},
				};
			}

			if (sql.includes("SET status       = 'pending'") && sql.includes("retryCount   = 0")) {
				return {
					run: (mediaId: number) => {
						const row = queueRows.get(mediaId);
						if (!row) {
							return;
						}
						queueRows.set(
							mediaId,
							{
								...row,
								status:       "pending",
								retryCount:   0,
								errorMessage: null,
								failureReason: null,
							},
						);
					},
				};
			}

			if (sql.includes("INTO anime_data.mediaHydrationQueueJikanEpisodesPriority")) {
				return {
					run: (mediaId: number, requestedAt: number) => {
						priorityRows.set(
							mediaId,
							{
								mediaId,
								priority: 1,
								requestedAt,
							},
						);
					},
				};
			}

			if (sql.includes("SET lastTriedAt  = ?") && sql.includes("retryCount   = retryCount + 1")) {
				return {
					run: (lastTriedAt: number, errorMessage: string, failureReason: string, mediaId: number) => {
						const row = queueRows.get(mediaId);
						if (!row) {
							return;
						}
						const nextRetryCount = row.retryCount + 1;
						queueRows.set(
							mediaId,
							{
								...row,
								lastTriedAt,
								errorMessage,
								failureReason,
								retryCount: nextRetryCount,
								status:     nextRetryCount >= 3
															? "failed"
															: "pending",
							},
						);
					},
				};
			}

			if (sql.includes("SET status      = 'processing'")) {
				return {
					run: (lastTriedAt: number, mediaId: number) => {
						const row = queueRows.get(mediaId);
						if (!row) {
							return;
						}
						queueRows.set(
							mediaId,
							{
								...row,
								status: "processing",
								lastTriedAt,
							},
						);
					},
				};
			}

			if (sql.includes("SELECT mediaId, errorMessage, failureReason, retryCount, lastTriedAt") && sql.includes("status = 'failed'")) {
				return {
					get: (mediaId: number) => {
						const row = queueRows.get(mediaId);
						return row?.status === "failed"
							? {
								mediaId:      row.mediaId,
								errorMessage: row.errorMessage,
								failureReason: row.failureReason,
								retryCount:   row.retryCount,
								lastTriedAt:  row.lastTriedAt,
							}
							: undefined;
					},
				};
			}

			if (sql.includes("SELECT mediaId, status") && sql.includes("FROM anime_data.mediaHydrationQueueJikanEpisodes")) {
				return {
					get: (mediaId: number) => {
						const row = queueRows.get(mediaId);
						return row
							? {
								mediaId: row.mediaId,
								status:  row.status,
							}
							: undefined;
					},
				};
			}

			if (sql.includes("SELECT COUNT(*) as count") && sql.includes("mediaHydrationQueueJikanEpisodesPriority")) {
				return {
					get: (mediaId: number) => ({
						count: priorityRows.has(mediaId)
										 ? 1
										 : 0,
					}),
				};
			}

			if (sql.includes("SELECT q.mediaId") && sql.includes("mediaHydrationQueueJikanEpisodes q")) {
				return {
					all: (now: number) => Array.from(queueRows.values())
						.filter((row) => {
							if (row.retryCount >= 3) {
								return false;
							}
							if (row.status === "processing") {
								return true;
							}
							if (row.status !== "pending") {
								return false;
							}
							if (row.retryCount === 0 || row.lastTriedAt == null) {
								return true;
							}
							const backoffMs = row.retryCount <= 1
								? 120_000
								: row.retryCount === 2
									? 300_000
									: 900_000;
							return row.lastTriedAt <= now - backoffMs;
						})
						.sort((left, right) => {
							const leftPriority       = priorityRows.get(left.mediaId);
							const rightPriority      = priorityRows.get(right.mediaId);
							const leftPriorityValue  = leftPriority?.priority ?? 0;
							const rightPriorityValue = rightPriority?.priority ?? 0;
							if (rightPriorityValue !== leftPriorityValue) {
								return rightPriorityValue - leftPriorityValue;
							}
							const leftRequestedAt  = leftPriority?.requestedAt ?? 0;
							const rightRequestedAt = rightPriority?.requestedAt ?? 0;
							if (rightRequestedAt !== leftRequestedAt) {
								return rightRequestedAt - leftRequestedAt;
							}
							return left.mediaId - right.mediaId;
						})
						.map((row) => ({ mediaId: row.mediaId })),
				};
			}

			throw new Error(`Unexpected SQL in queue-status test: ${ sql }`);
		},
	};
}

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: getDatabaseMock,
	}),
);

describe(
	"queue-status episode update policy",
	() => {
		beforeEach(() => {
			vi.resetModules();
			vi.clearAllMocks();
			resetState();
			getDatabaseMock.mockReturnValue(createMockDatabase());
		});

		it(
			"keeps failed Jikan episode updates pending until the retry limit and then marks them failed",
			async () => {
				const {
								enqueueGroupJikanEpisodesQueue,
								getFailedGroupJikanEpisodesQueueEntry,
								getGroupJikanEpisodesQueueStatus,
								updateFailedGroupJikanEpisodesQueue,
							} = await import("./queue-status");

				enqueueGroupJikanEpisodesQueue(
					101,
					false,
				);

				updateFailedGroupJikanEpisodesQueue(
					101,
					"attempt-1",
					"transient_failure",
				);
				expect(getGroupJikanEpisodesQueueStatus(101)).toMatchObject({
					mediaId: 101,
					status:  "pending",
				});
				expect(getFailedGroupJikanEpisodesQueueEntry(101)).toBeNull();

				updateFailedGroupJikanEpisodesQueue(
					101,
					"attempt-2",
					"transient_failure",
				);
				expect(getGroupJikanEpisodesQueueStatus(101)).toMatchObject({
					mediaId: 101,
					status:  "pending",
				});
				expect(getFailedGroupJikanEpisodesQueueEntry(101)).toBeNull();

				updateFailedGroupJikanEpisodesQueue(
					101,
					"attempt-3",
					"transient_failure",
				);
				expect(getGroupJikanEpisodesQueueStatus(101)).toMatchObject({
					mediaId: 101,
					status:  "failed",
				});
				expect(getFailedGroupJikanEpisodesQueueEntry(101)).toMatchObject({
					mediaId:      101,
					errorMessage: "attempt-3",
					failureReason: "transient_failure",
					retryCount:   3,
				});
			},
		);

		it(
			"manual requeue resets failed episode updates back to pending and restores priority",
			async () => {
				const {
								enqueueGroupJikanEpisodesQueue,
								getFailedGroupJikanEpisodesQueueEntry,
								getGroupJikanEpisodesQueueStatus,
								hasGroupJikanEpisodesQueueManualPriority,
								updateFailedGroupJikanEpisodesQueue,
							} = await import("./queue-status");

				enqueueGroupJikanEpisodesQueue(
					101,
					false,
				);
				updateFailedGroupJikanEpisodesQueue(
					101,
					"attempt-1",
					"transient_failure",
				);
				updateFailedGroupJikanEpisodesQueue(
					101,
					"attempt-2",
					"transient_failure",
				);
				updateFailedGroupJikanEpisodesQueue(
					101,
					"attempt-3",
					"transient_failure",
				);
				expect(getGroupJikanEpisodesQueueStatus(101)?.status).toBe("failed");

				enqueueGroupJikanEpisodesQueue(
					101,
					true,
				);

				expect(getGroupJikanEpisodesQueueStatus(101)).toMatchObject({
					mediaId: 101,
					status:  "pending",
				});
				expect(getFailedGroupJikanEpisodesQueueEntry(101)).toBeNull();
				expect(hasGroupJikanEpisodesQueueManualPriority(101)).toBe(true);
				expect(queueRows.get(101)).toMatchObject({
					retryCount:   0,
					errorMessage: null,
				});
			},
		);

		it(
			"does not reset an in-flight processing row when manual retry is requested",
			async () => {
				const {
								enqueueGroupJikanEpisodesQueue,
								getGroupJikanEpisodesQueueStatus,
								hasGroupJikanEpisodesQueueManualPriority,
								markGroupJikanEpisodesQueueProcessing,
								updateFailedGroupJikanEpisodesQueue,
							} = await import("./queue-status");

				enqueueGroupJikanEpisodesQueue(
					102,
					false,
				);
				updateFailedGroupJikanEpisodesQueue(
					102,
					"attempt-1",
					"transient_failure",
				);
				markGroupJikanEpisodesQueueProcessing(102);

				enqueueGroupJikanEpisodesQueue(
					102,
					true,
				);

				expect(getGroupJikanEpisodesQueueStatus(102)).toMatchObject({
					mediaId: 102,
					status:  "processing",
				});
				expect(hasGroupJikanEpisodesQueueManualPriority(102)).toBe(true);
				expect(queueRows.get(102)).toMatchObject({
					retryCount:   1,
					errorMessage: "attempt-1",
					failureReason: "transient_failure",
				});
			},
		);

		it(
			"orders episode update queue reads by manual priority before default pending items",
			async () => {
				vi.spyOn(
					Date,
					"now",
				)
					.mockReturnValueOnce(100)
					.mockReturnValueOnce(200)
					.mockReturnValueOnce(300);

				const {
								enqueueGroupJikanEpisodesQueue,
								getMediasFromGroupJikanEpisodesQueue,
							} = await import("./queue-status");

				enqueueGroupJikanEpisodesQueue(
					101,
					false,
				);
				enqueueGroupJikanEpisodesQueue(
					102,
					false,
				);
				enqueueGroupJikanEpisodesQueue(
					103,
					true,
				);

				expect(getMediasFromGroupJikanEpisodesQueue()).toEqual([
					103,
					101,
					102,
				]);
			},
		);

		it(
			"holds retryable episode update failures out of daemon reads until their cooldown expires",
			async () => {
				const nowSpy = vi.spyOn(
					Date,
					"now",
				)
					.mockReturnValue(1_000);

				const {
								enqueueGroupJikanEpisodesQueue,
								getMediasFromGroupJikanEpisodesQueue,
								updateFailedGroupJikanEpisodesQueue,
							} = await import("./queue-status");

				enqueueGroupJikanEpisodesQueue(
					101,
					false,
				);
				updateFailedGroupJikanEpisodesQueue(
					101,
					"attempt-1",
					"transient_failure",
				);

				expect(getMediasFromGroupJikanEpisodesQueue()).toEqual([]);
				nowSpy.mockReturnValue(121_000);
				expect(getMediasFromGroupJikanEpisodesQueue()).toEqual([ 101 ]);
			},
		);
	},
);
