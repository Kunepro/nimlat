import {
	AnimeDbFacade,
	UserDbFacade,
} from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	ReleaseWatchMediaFactsDto,
	UserScheduledMediaRefreshDto,
} from "@nimlat/types/anime-db";
import {
	catchError,
	defer,
	EMPTY,
	exhaustMap,
	interval,
	startWith,
	Subscription,
} from "rxjs";
import { MediaProviderRegistry } from "../providers/media-provider-registry";
import { ingestAnimeDbMedia } from "../services/anime-db/anime-db-media-ingestion";
import { ReleaseWatchCoordinator } from "../services/release-watch/release-watch-coordinator";

const RELEASE_WATCH_SWEEP_INTERVAL_MS = 60_000;
const RELEASE_WATCH_BATCH_LIMIT       = 10;

function buildCatalogStateHash(facts: ReleaseWatchMediaFactsDto | undefined): string {
	if (!facts) {
		return "missing";
	}

	return JSON.stringify({
		mediaId:        facts.mediaId,
		format:         facts.format ?? null,
		status:         facts.status ?? null,
		episodesCount:  facts.episodesCount ?? null,
		nextAiringEpisodeJson: facts.nextAiringEpisodeJson ?? null,
		startDateYear:  facts.startDateYear ?? null,
		startDateMonth: facts.startDateMonth ?? null,
		startDateDay:   facts.startDateDay ?? null,
	});
}

async function processSingleScheduledRefresh(refresh: UserScheduledMediaRefreshDto): Promise<void> {
	const [ beforeFacts ] = UserDbFacade.releaseWatch.getMediaFacts([ refresh.mediaId ]);
	const beforeHash      = buildCatalogStateHash(beforeFacts);

	try {
		const providerIds = AnimeDbFacade.media.getProviderIds(refresh.mediaId);
		if (typeof providerIds.idAniList !== "number") {
			throw new Error(`Cannot release-refresh media ${ refresh.mediaId } because no AniList provider id is available.`);
		}

		const refreshedMedia = await MediaProviderRegistry.getAniListMediaProvider().getMediaById(
			providerIds.idAniList,
			"background",
			{
				mediaId:   refresh.mediaId,
				idAniList: providerIds.idAniList,
				source:    "release-watch",
				recovery:  "release-watch records the failed attempt and reschedules through its coordinator",
			},
		);
		ingestAnimeDbMedia(
			refreshedMedia,
			{ source: "release-watch-daemon" },
		);

		const [ afterFacts ] = UserDbFacade.releaseWatch.getMediaFacts([ refresh.mediaId ]);
		const afterHash      = buildCatalogStateHash(afterFacts);

		ReleaseWatchCoordinator.handleScheduledRefreshAttempt({
			refresh: {
				...refresh,
				lastObservedCatalogStateHash: beforeHash,
			},
			outcome: beforeHash === afterHash ? "refreshed_no_change" : "refreshed_changed",
		});
	} catch (error) {
		const safeError = typeSafeError(error);

		LoggerUtils.logMainServiceError(
			"release-watch-daemon.process-refresh",
			safeError,
			{
				mediaId: refresh.mediaId,
				releaseWatchReason: refresh.releaseWatchReason,
				scheduledReleaseAt: refresh.scheduledReleaseAt,
			},
		);
		ReleaseWatchCoordinator.handleScheduledRefreshAttempt({
			refresh: {
				...refresh,
				lastObservedCatalogStateHash: beforeHash,
			},
			outcome: "failed",
			errorMessage: safeError.message,
		});
	}
}

async function processDueReleaseWatchRefreshes(): Promise<void> {
	const dueRefreshes = UserDbFacade.releaseWatch.listDueScheduledRefreshes(
		Date.now(),
		RELEASE_WATCH_BATCH_LIMIT,
	);

	for (const refresh of dueRefreshes) {
		await processSingleScheduledRefresh(refresh);
	}
}

// Background release-window monitor. RxJS owns the polling pipeline so overlapping
// sweeps are dropped by exhaustMap and shutdown can stop future DB reads cleanly.
export class ReleaseWatchDaemon {
	private sweepSubscription: Subscription | null = null;

	constructor() {
		this.start();
	}

	public dispose(): void {
		this.sweepSubscription?.unsubscribe();
		this.sweepSubscription = null;
	}

	private start(): void {
		if (this.sweepSubscription) {
			return;
		}

		this.sweepSubscription = interval(RELEASE_WATCH_SWEEP_INTERVAL_MS)
			.pipe(
				startWith(0),
				exhaustMap(() => defer(() => processDueReleaseWatchRefreshes()).pipe(
					catchError((error: unknown) => {
						LoggerUtils.logMainServiceError(
							"release-watch-daemon.loop",
							typeSafeError(error),
						);
						return EMPTY;
					}),
				)),
			)
			.subscribe();
	}
}
