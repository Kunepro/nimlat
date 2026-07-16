import { BUS_CatalogMediaIngested } from "@nimlat/busses/main";
import { AnimeDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	AnimeDbMediaIngestionSource,
	CatalogMediaIngestedEvent,
} from "@nimlat/types/anime-db";
import {
	bufferTime,
	filter,
	map,
	Subscription,
} from "rxjs";
import { computeGroupsForNewMedia } from "../../utils/compute-group-for-new-media/compute-group-for-new-media";
import { LibrarySideEffectsCoordinator } from "../library/library-side-effects-coordinator";

const CATALOG_SIDE_EFFECT_BUFFER_MS = 250;

const RENDERER_VISIBLE_INGESTION_SOURCES = new Set<AnimeDbMediaIngestionSource>([
	"anime-db-updater",
	"release-watch-daemon",
	"group-explorer-refresh",
	"media-inspection-refresh",
]);

let subscriptions: Subscription[] = [];

function uniqueNumbers(values: number[]): number[] {
	return Array.from(new Set(values));
}

function collectGroupingReplayMediaIds(mediaId: number): number[] {
	const incomingSourceMediaIds = AnimeDbFacade.media.relations
		.incomingSourceMedias(mediaId)
		.map((relation) => relation.mediaId);

	return uniqueNumbers([
		mediaId,
		...incomingSourceMediaIds,
	]);
}

function replayGroupingForIngestedMedia(event: CatalogMediaIngestedEvent): void {
	try {
		const replayMediaIds = collectGroupingReplayMediaIds(event.mediaId);

		for (const mediaId of replayMediaIds) {
			computeGroupsForNewMedia(mediaId);
		}
	} catch (error) {
		LoggerUtils.logMainServiceError(
			"catalog-media-ingestion-events.grouping-replay",
			typeSafeError(error),
			{ ...event },
		);
	}
}

function groupEventsBySource(events: CatalogMediaIngestedEvent[]): Map<AnimeDbMediaIngestionSource, CatalogMediaIngestedEvent[]> {
	const grouped = new Map<AnimeDbMediaIngestionSource, CatalogMediaIngestedEvent[]>();

	for (const event of events) {
		const current = grouped.get(event.source) ?? [];
		current.push(event);
		grouped.set(
			event.source,
			current,
		);
	}

	return grouped;
}

function publishCatalogSideEffects(events: CatalogMediaIngestedEvent[]): void {
	for (const [
							 source,
							 sourceEvents,
						 ] of groupEventsBySource(events)) {
		const affectedMediaIds = uniqueNumbers(sourceEvents.map((event) => event.mediaId));

		try {
			LibrarySideEffectsCoordinator.handleCatalogMediaMutation({
				affectedMediaIds,
				publishRendererInvalidation: RENDERER_VISIBLE_INGESTION_SOURCES.has(source),
				context:                     source,
			});
		} catch (error) {
			LoggerUtils.logMainServiceError(
				"catalog-media-ingestion-events.catalog-side-effects",
				typeSafeError(error),
				{
					source,
					affectedMediaIds,
				},
			);
		}
	}
}

// Register main-process reactions to catalog ingestion once.
// Producers only publish BUS_CatalogMediaIngested; this pipeline owns grouping replay,
// renderer invalidation policy, and downstream catalog side effects.
export function initCatalogMediaIngestionEvents(): void {
	if (subscriptions.length > 0) {
		return;
	}

	subscriptions = [
		BUS_CatalogMediaIngested.subscribe({
			next: replayGroupingForIngestedMedia,
		}),
		BUS_CatalogMediaIngested.pipe(
			bufferTime(CATALOG_SIDE_EFFECT_BUFFER_MS),
			map((events) => events.filter((event) => event.mediaId > 0)),
			filter((events) => events.length > 0),
		).subscribe({
			next: publishCatalogSideEffects,
		}),
	];
}

export function disposeCatalogMediaIngestionEvents(): void {
	subscriptions.forEach((subscription) => subscription.unsubscribe());
	subscriptions = [];
}
