// @vitest-environment node
import { IpcChannels } from "@nimlat/constants/ipc-channels";
import { Subject } from "rxjs";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

const logMainServiceError = vi.fn();
const broadcastToRendererWindows = vi.fn();

let buses: {
	BUS_GroupListChanged: Subject<{ affectedGroups?: Array<{ source: "official" | "user"; groupId: number }> }>;
	BUS_GroupMediaListChanged: Subject<{
		groups?: Array<{ source: "official" | "user"; groupId: number }>;
		affectedMediaIds?: number[]
	}>;
	BUS_GroupMediaItemsPatched: Subject<{
		group?: { source: "official" | "user"; groupId: number };
		patches: Array<{ mediaId: number } & Record<string, unknown>>
	}>;
	BUS_MediaEpisodesListChanged: Subject<{ mediaId: number }>;
	BUS_MediaEpisodesItemsPatched: Subject<{
		mediaId: number;
		patches: Array<{ episodeNumber: number } & Record<string, unknown>>
	}>;
};

describe(
	"initGroupExplorerEventsBridge",
	() => {
		beforeAll(async () => {
			vi.useFakeTimers();
			buses = {
				BUS_GroupListChanged:          new Subject<{
					affectedGroups?: Array<{ source: "official" | "user"; groupId: number }>
				}>(),
				BUS_GroupMediaListChanged:     new Subject<{
					groups?: Array<{ source: "official" | "user"; groupId: number }>;
					affectedMediaIds?: number[]
				}>(),
				BUS_GroupMediaItemsPatched:    new Subject<{
					group?: { source: "official" | "user"; groupId: number };
					patches: Array<{ mediaId: number } & Record<string, unknown>>
				}>(),
				BUS_MediaEpisodesListChanged:  new Subject<{ mediaId: number }>(),
				BUS_MediaEpisodesItemsPatched: new Subject<{
					mediaId: number;
					patches: Array<{ episodeNumber: number } & Record<string, unknown>>
				}>(),
			};

			vi.doMock(
				"@nimlat/busses/main",
				() => buses,
			);
			vi.doMock(
				"@nimlat/loggers/main",
				() => ({
					LoggerUtils: {
						logMainServiceError,
					},
				}),
			);
			vi.doMock(
				"../utils/ipc-broadcast",
				() => ({
					broadcastToRendererWindows,
				}),
			);
			const { initGroupExplorerEventsBridge } = await import("./group-explorer-events-bridge");
			initGroupExplorerEventsBridge();
		});

		afterAll(async () => {
			const { disposeGroupExplorerEventsBridge } = await import("./group-explorer-events-bridge");
			disposeGroupExplorerEventsBridge();
			vi.useRealTimers();
			vi.doUnmock("../utils/ipc-broadcast");
			buses.BUS_GroupListChanged.complete();
			buses.BUS_GroupMediaListChanged.complete();
			buses.BUS_GroupMediaItemsPatched.complete();
			buses.BUS_MediaEpisodesListChanged.complete();
			buses.BUS_MediaEpisodesItemsPatched.complete();
		});

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it(
			"coalesces group-media invalidation bursts into one deduplicated bridge event",
			async () => {
				buses.BUS_GroupMediaListChanged.next({
					groups: [
						{
							source:  "official",
							groupId: 5,
						},
						{
							source:  "official",
							groupId: 6,
						},
					],
					affectedMediaIds: [
						100,
						101,
					],
				});
				buses.BUS_GroupMediaListChanged.next({
					groups: [
						{
							source:  "official",
							groupId: 6,
						},
						{
							source:  "user",
							groupId: 7,
						},
					],
					affectedMediaIds: [
						101,
						102,
					],
				});

				await vi.advanceTimersByTimeAsync(130);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					IpcChannels.GroupMediaListChanged,
					{
						groups:           [
							{
								source:  "official",
								groupId: 5,
							},
							{
								source:  "official",
								groupId: 6,
							},
							{
								source:  "user",
								groupId: 7,
							},
						],
						affectedMediaIds: [
							100,
							101,
							102,
						],
					},
				);
			},
		);

		it(
			"chunks large group-media patch bursts before crossing IPC",
			async () => {
				buses.BUS_GroupMediaItemsPatched.next({
					patches: Array.from(
						{ length: 501 },
						(_, index) => ({
							mediaId:   index + 1,
							isWatched: true,
						}),
					),
				});

				await vi.advanceTimersByTimeAsync(130);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(2);
				expect(broadcastToRendererWindows.mock.calls.map(([ channel, event ]) => ({
					channel,
					patchCount: (event as { patches: unknown[] }).patches.length,
				}))).toEqual([
					{
						channel:    IpcChannels.GroupMediaItemsPatched,
						patchCount: 500,
					},
					{
						channel:    IpcChannels.GroupMediaItemsPatched,
						patchCount: 1,
					},
				]);
			},
		);

		it(
			"preserves per-media granularity for media-episodes invalidation events",
			async () => {
				buses.BUS_MediaEpisodesListChanged.next({ mediaId: 920001 });
				buses.BUS_MediaEpisodesListChanged.next({ mediaId: 920001 });
				buses.BUS_MediaEpisodesListChanged.next({ mediaId: 920002 });

				await vi.advanceTimersByTimeAsync(130);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(2);
				expect(broadcastToRendererWindows).toHaveBeenNthCalledWith(
					1,
					IpcChannels.MediaEpisodesListChanged,
					{ mediaId: 920001 },
				);
				expect(broadcastToRendererWindows).toHaveBeenNthCalledWith(
					2,
					IpcChannels.MediaEpisodesListChanged,
					{ mediaId: 920002 },
				);
			},
		);

		it(
			"does not attach duplicate bridge subscriptions",
			async () => {
				const { initGroupExplorerEventsBridge } = await import("./group-explorer-events-bridge");
				initGroupExplorerEventsBridge();

				buses.BUS_GroupListChanged.next({
					affectedGroups: [
						{
							source:  "official",
							groupId: 55,
						},
					],
				});

				await vi.advanceTimersByTimeAsync(130);

				expect(broadcastToRendererWindows).toHaveBeenCalledTimes(1);
				expect(broadcastToRendererWindows).toHaveBeenCalledWith(
					IpcChannels.GroupListChanged,
					{
						affectedGroups: [
							{
								source:  "official",
								groupId: 55,
							},
						],
					},
				);
			},
		);
	},
);
