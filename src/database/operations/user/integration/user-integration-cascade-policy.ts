import type { UserGroupingMode } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";

export interface PlaybackIssueMomentIdentity {
	playbackIssueCategory: string;
	timeSeconds: number;
}

// Playback moments are replacement-written by category/time identity so repeated UI edits
// cannot create duplicate markers for the same playback position.
export function createPlaybackIssueMomentKey(moment: PlaybackIssueMomentIdentity): string {
	return `${ moment.playbackIssueCategory }-${ moment.timeSeconds }`;
}

export function dedupePlaybackIssueMoments<TMoment extends PlaybackIssueMomentIdentity>(
	playbackIssueMoments: TMoment[],
): TMoment[] {
	const dedupedMoments = new Map<string, TMoment>();
	playbackIssueMoments.forEach((moment) => {
		dedupedMoments.set(
			createPlaybackIssueMomentKey(moment),
			moment,
		);
	});

	return Array.from(dedupedMoments.values());
}

export function collectUniqueNumbers(values: number[]): number[] {
	return Array.from(new Set(values));
}

export function resolveGroupingModeForGroupRef(group: GroupRef): UserGroupingMode {
	return group.source === "user" ? "user" : "anime";
}

export function normalizeGroupRefs(groups: GroupRef[]): GroupRef[] {
	return Array.from(new Map(groups.map((group): [ string, GroupRef ] => [
		`${ group.source }:${ group.groupId }`,
		group,
	])).values());
}

export function createAffectedGroupRefs(
	affectedAnimeGroupIds: number[],
	affectedUserGroupIds: number[],
): GroupRef[] {
	return Array.from(new Map<string, GroupRef>([
		...affectedAnimeGroupIds.map((groupId): [ string, GroupRef ] => [
			`official:${ groupId }`,
			{
				source: "official",
				groupId,
			},
		]),
		...affectedUserGroupIds.map((groupId): [ string, GroupRef ] => [
			`user:${ groupId }`,
			{
				source: "user",
				groupId,
			},
		]),
	]).values());
}
