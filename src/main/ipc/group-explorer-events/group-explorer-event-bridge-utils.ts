import { createGroupLibraryItemKey } from "@nimlat/functions";
import { GroupRef } from "@nimlat/types/nimlat-ids";

export const GROUP_EXPLORER_EVENT_BRIDGE_BUFFER_MS = 120;
export const MAX_GROUP_MEDIA_CHANGED_IDS_PER_EVENT = 500;

type EpisodePatch = { episodeNumber: number } & Record<string, unknown>;
export type MediaEpisodePatchBurst = {
	mediaId: number;
	patches: EpisodePatch[];
};

export function collectUniqueIds<T>(
	items: T[],
	readIds: (item: T) => number[] | undefined,
): number[] | undefined {
	const ids = items.flatMap((item) => readIds(item) ?? []);

	return ids.length > 0
		? Array.from(new Set(ids))
		: undefined;
}

export function collectUniqueGroupRefs<T>(
	items: T[],
	readGroups: (item: T) => GroupRef[] | undefined,
): GroupRef[] | undefined {
	const groups = items.flatMap((item) => readGroups(item) ?? []);
	if (groups.length === 0) {
		return undefined;
	}

	return Array.from(new Map(groups.map((group) => [
		createGroupLibraryItemKey(group),
		group,
	])).values());
}

export function chunkValues<TValue>(values: TValue[], chunkSize: number): TValue[][] {
	const chunks: TValue[][] = [];
	for (let index = 0; index < values.length; index += chunkSize) {
		chunks.push(values.slice(
			index,
			index + chunkSize,
		));
	}
	return chunks;
}

// Merge partial patch bursts by stable item id so the latest payload wins per field.
export function mergePatchesById<TPatch extends Record<string, unknown>>(
	patches: TPatch[],
	readId: (patch: TPatch) => number,
	idField: string,
): TPatch[] {
	const mergedById = new Map<number, Record<string, unknown>>();

	patches.forEach((patch) => {
		const id      = readId(patch);
		const current = mergedById.get(id) || { [ idField ]: id };
		mergedById.set(
			id,
			{
				...current,
				...patch,
			},
		);
	});

	return Array.from(mergedById.values()) as TPatch[];
}

// Group events by media scope, then merge episode row patches inside each media id.
export function mergeEpisodePatchBurstsByMediaId(batch: MediaEpisodePatchBurst[]): MediaEpisodePatchBurst[] {
	const patchesByMediaId = new Map<number, EpisodePatch[]>();

	batch.forEach((event) => {
		const existing = patchesByMediaId.get(event.mediaId) ?? [];
		patchesByMediaId.set(
			event.mediaId,
			existing.concat(event.patches),
		);
	});

	return Array.from(patchesByMediaId.entries()).map(([ mediaId, patches ]) => ({
		mediaId,
		patches: mergePatchesById(
			patches,
			(patch) => patch.episodeNumber,
			"episodeNumber",
		),
	}));
}
