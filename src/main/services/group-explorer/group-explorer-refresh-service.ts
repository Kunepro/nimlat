import { BUS_HydratorQueueChanges } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	GroupRefreshActionResult,
	MediaRefreshActionResult,
	RetryMediaEpisodeUpdatesResult,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import { MediaProviderRegistry } from "../../providers/media-provider-registry";
import { Toaster } from "../../utils/toaster";
import { ingestAnimeDbMedia } from "../anime-db/anime-db-media-ingestion";
import { GroupReadRepository } from "../group/group-read-repository";

const GROUP_REFRESH_COOLDOWN_MS = 10 * 60 * 1000;

function hasAnyFailedHydrationIssue(mediaIds: number[]): boolean {
	return mediaIds.some((mediaId) => AnimeDbFacade.media.hasFailedHydrationIssue(mediaId));
}

function formatCooldownRemaining(milliseconds: number): string {
	const totalSeconds = Math.max(
		0,
		Math.ceil(milliseconds / 1000),
	);
	const minutes      = Math.floor(totalSeconds / 60);
	const seconds      = totalSeconds % 60;

	return `${ minutes.toString().padStart(
		2,
		"0",
	) }:${ seconds.toString().padStart(
		2,
		"0",
	) }`;
}

function getCooldownFailure(lastRefreshAt: number | undefined, hasFailedHydrationIssue: boolean): string | null {
	if (hasFailedHydrationIssue || typeof lastRefreshAt !== "number") {
		return null;
	}

	const remainingCooldownMs = GROUP_REFRESH_COOLDOWN_MS - (Date.now() - lastRefreshAt);
	return remainingCooldownMs > 0
		? `Refresh available again in ${ formatCooldownRemaining(remainingCooldownMs) }.`
		: null;
}

export function retryMediaEpisodeUpdates(mediaId: number): RetryMediaEpisodeUpdatesResult {
	try {
		AnimeDbFacade.retryMediaEpisodeUpdates(mediaId);
		// Trigger daemon manager queue check immediately.
		BUS_HydratorQueueChanges.next();
		return { success: true };
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"group-explorer.retry-media-episode-updates",
			tsError,
			{ mediaId },
		);
		return {
			success: false,
			error:   tsError.message,
		};
	}
}

export async function refreshGroup(group: GroupRef): Promise<GroupRefreshActionResult> {
	const groupId = group.groupId;
	try {
		const mediaIds                = GroupReadRepository.getMediaIdsByRef(group);
		const hasFailedHydrationIssue = hasAnyFailedHydrationIssue(mediaIds);
		const cooldownFailure         = getCooldownFailure(
			GroupReadRepository.getLastRefreshAtByRef(group),
			hasFailedHydrationIssue,
		);
		if (cooldownFailure) {
			Toaster.info(cooldownFailure);
			return {
				success: false,
				error:   cooldownFailure,
			};
		}
		if (mediaIds.length === 0) {
			Toaster.error("This group has no medias to refresh.");
			return {
				success: false,
				error:   "This group has no medias to refresh.",
			};
		}

		for (const mediaId of mediaIds) {
			await refreshProviderMediaByLocalId(
				mediaId,
				"group-refresh",
			);
		}

		Toaster.success(`Group refreshed (${ mediaIds.length } medias).`);
		return { success: true };
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"group-explorer.refresh-group",
			tsError,
			{ groupId },
		);
		Toaster.error("Failed to refresh group.");
		return {
			success: false,
			error:   tsError.message,
		};
	}
}

export async function refreshMedia(mediaId: number): Promise<MediaRefreshActionResult> {
	try {
		const hasFailedHydrationIssue = AnimeDbFacade.media.hasFailedHydrationIssue(mediaId);
		const cooldownFailure         = getCooldownFailure(
			AnimeDbFacade.media.getLastRefreshAt(mediaId),
			hasFailedHydrationIssue,
		);
		if (cooldownFailure) {
			Toaster.info(cooldownFailure);
			return {
				success: false,
				error:   cooldownFailure,
			};
		}

		await refreshProviderMediaByLocalId(
			mediaId,
			"media-refresh",
		);
		Toaster.success("Media refreshed.");
		return { success: true };
	} catch (error) {
		const tsError = typeSafeError(error);
		LoggerUtils.logMainServiceError(
			"group-explorer.refresh-media",
			tsError,
			{ mediaId },
		);
		Toaster.error("Failed to refresh media.");
		return {
			success: false,
			error:   tsError.message,
		};
	}
}

async function refreshProviderMediaByLocalId(mediaId: number, source: "group-refresh" | "media-refresh"): Promise<void> {
	const providerIds = AnimeDbFacade.media.getProviderIds(mediaId);
	if (typeof providerIds.idAniList !== "number") {
		throw new Error(`Cannot refresh media ${ mediaId } because no AniList provider id is available.`);
	}
	const refreshedMedia = await MediaProviderRegistry.getAniListMediaProvider().getMediaById(
		providerIds.idAniList,
		"manual",
		{
			mediaId,
			idAniList: providerIds.idAniList,
			source,
			recovery:  `${ source === "group-refresh"
				? "group"
				: "media" } refresh returns an error to the caller; no hydrator queue retry owns this request`,
		},
	);
	ingestAnimeDbMedia(
		refreshedMedia,
		{ source: "group-explorer-refresh" },
	);
}
