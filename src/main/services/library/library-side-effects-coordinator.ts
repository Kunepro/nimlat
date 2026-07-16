import {
	BUS_GroupListChanged,
	BUS_GroupMediaListChanged,
	BUS_MediaEpisodesListChanged,
} from "@nimlat/busses/main";
import { IntegrationCascadeResultDto } from "@nimlat/types/anime-db";
import { GroupRef } from "@nimlat/types/nimlat-ids";
import { ReleaseWatchCoordinator } from "../release-watch/release-watch-coordinator";

interface CatalogMediaMutationSideEffects {
	affectedMediaIds: number[];
	affectedGroups?: GroupRef[];
	publishRendererInvalidation?: boolean;
	context: string;
}

interface GroupingMutationSideEffects {
	affectedMediaIds: number[];
	affectedGroups: GroupRef[];
	context: string;
}

// Thin orchestration layer for renderer-visible library mutations. It coordinates
// independent invalidation and Release Watch reactions without moving their domain
// rules into IPC-facing services or this facade-like coordinator.
export class LibrarySideEffectsCoordinator {
	// Integration cascades change progress/tracking projections and therefore need
	// both renderer invalidation and a Release Watch interest refresh.
	public static handleIntegrationCascade(cascade: IntegrationCascadeResultDto): void {
		this.publishRendererInvalidation(
			cascade.affectedMediaIds,
			cascade.affectedGroups,
		);
		ReleaseWatchCoordinator.tryHandleIntegrationCascade(
			cascade.affectedMediaIds,
			"integration-cascade",
		);
	}

	// Canonical media writes may originate from background catalog generation or
	// renderer-visible updates. Callers explicitly choose renderer invalidation;
	// Release Watch always receives the new catalog facts.
	public static handleCatalogMediaMutation({
																						 affectedMediaIds,
																						 affectedGroups = [],
																						 publishRendererInvalidation = false,
																						 context,
																					 }: CatalogMediaMutationSideEffects): void {
		if (publishRendererInvalidation) {
			this.publishRendererInvalidation(
				affectedMediaIds,
				affectedGroups,
			);
		}

		ReleaseWatchCoordinator.tryHandleCatalogMediaMutation({
			affectedMediaIds,
			context,
		});
	}

	// User grouping changes affect explorer/inspection composition but do not alter
	// tracking intent or the relation-derived Release Watch scope.
	public static handleGroupingMutation({
																				 affectedMediaIds,
																				 affectedGroups,
																			 }: GroupingMutationSideEffects): void {
		if (affectedMediaIds.length > 0) {
			BUS_GroupMediaListChanged.next({
				groups: affectedGroups.length > 0 ? affectedGroups : undefined,
				affectedMediaIds: affectedMediaIds,
			});
		}

		if (affectedGroups.length > 0) {
			BUS_GroupListChanged.next({ affectedGroups });
		}
	}

	private static publishRendererInvalidation(
		affectedMediaIds: number[],
		affectedGroups: GroupRef[],
	): void {
		affectedMediaIds.forEach((mediaId) => {
			BUS_MediaEpisodesListChanged.next({ mediaId });
		});

		if (affectedMediaIds.length > 0) {
			BUS_GroupMediaListChanged.next({
				groups: affectedGroups.length > 0 ? affectedGroups : undefined,
				affectedMediaIds: affectedMediaIds,
			});
		}

		if (affectedGroups.length > 0) {
			BUS_GroupListChanged.next({ affectedGroups });
		}
	}
}
