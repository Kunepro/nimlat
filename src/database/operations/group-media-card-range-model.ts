import { createSearchKey } from "@nimlat/functions";
import type { GroupMediaWallRange } from "@nimlat/types/ipc-payloads";
import {
	type GroupMediaCardRow,
	mapGroupMediaCardRow,
} from "./group-media-card-model";

export type GroupMediaCardRangeRow = GroupMediaCardRow & { isAdult: number };

export type GroupMediaCardRangeQueryInput = {
	likePattern: string;
	normalizedSearch: string;
};

export type GroupMediaCardRangeModelRows = {
	offset: number;
	rows: GroupMediaCardRangeRow[];
	total: number;
};

export function createGroupMediaCardRangeQueryInput(search: string): GroupMediaCardRangeQueryInput {
	const normalizedSearch = createSearchKey(search);

	return {
		likePattern: `%${ normalizedSearch }%`,
		normalizedSearch,
	};
}

export function createGroupMediaWallRange({
																						offset,
																						rows,
																						total,
																					}: GroupMediaCardRangeModelRows): GroupMediaWallRange {
	// The media wall consumes windowed ranges, so selectors must keep large group memberships
	// bounded before crossing IPC instead of materializing whole groups in the renderer.
	return {
		items: rows.map(mapGroupMediaCardRow),
		offset,
		total,
	};
}
