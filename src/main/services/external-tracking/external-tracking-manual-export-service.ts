import { BUS_ExternalTrackingExportProgress } from "@nimlat/busses/main";
import { UserDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	ExternalTrackingActionResult,
	ExternalTrackingProvider,
	ExternalTrackingPushItem,
} from "@nimlat/types/external-tracking";
import {
	defaultIfEmpty,
	lastValueFrom,
	tap,
} from "rxjs";
import { getExternalTrackingProviderLabel } from "./external-tracking-auth-flow";
import {
	getExternalTrackingErrorMessage,
	getExternalTrackingProviderClient,
} from "./external-tracking-provider-clients";
import { decryptExternalTrackingAccountSecret } from "./external-tracking-secret-storage";

function canExportItemToProvider(provider: ExternalTrackingProvider, item: ExternalTrackingPushItem): boolean {
	const hasIdMal     = typeof item.idMal === "number" && Number.isFinite(item.idMal) && item.idMal > 0;
	const hasIdAniList = typeof item.idAniList === "number" && Number.isFinite(item.idAniList) && item.idAniList > 0;
	const hasIdSimkl   = typeof item.idSimkl === "string" && item.idSimkl.trim().length > 0;
	const hasIdKitsu   = typeof item.idKitsu === "string" && item.idKitsu.trim().length > 0;
	if (provider === "mal") return hasIdMal;
	if (provider === "anilist") return hasIdAniList;
	if (provider === "simkl") {
		return hasIdSimkl || hasIdMal || hasIdAniList;
	}
	return hasIdKitsu || hasIdMal || hasIdAniList;
}

// Explicit export drains SQLite's provider-specific dirty set and returns only
// after the remote API succeeds or fails. It never schedules background work.
export async function exportExternalTrackingProvider(provider: ExternalTrackingProvider): Promise<ExternalTrackingActionResult> {
	const providerLabel = getExternalTrackingProviderLabel(provider);
	const account       = UserDbFacade.externalTracking.getAccountSecret(provider);
	if (!account || account.status !== "connected") {
		return {
			success: false,
			message: `${ providerLabel } is not connected.`,
		};
	}

	let itemCount      = 0;
	let progressActive = false;
	let completedItems = 0;
	try {
		const pendingItems = UserDbFacade.externalTracking.listPendingExportItems(provider);
		const items        = pendingItems
			.filter(item => canExportItemToProvider(
				provider,
				item,
			));
		itemCount          = items.length;
		if (pendingItems.length === 0) {
			return {
				success: true,
				message: `No local watch-state changes to export to ${ providerLabel }.`,
			};
		}
		if (itemCount === 0) {
			return {
				success: false,
				message: `Export incomplete: ${ pendingItems.length } changed anime lack a ${ providerLabel } identifier.`,
			};
		}

		const client        = getExternalTrackingProviderClient(provider);
		const accountSecret = decryptExternalTrackingAccountSecret(account);
		const progress$     = client.streamWatchedBatchPush?.(
			accountSecret,
			items,
		);
		if (progress$) {
			progressActive = true;
			BUS_ExternalTrackingExportProgress.next({
				provider,
				completedItems,
				totalItems: itemCount,
				active:     true,
			});
			await lastValueFrom(progress$.pipe(
				tap((progress) => {
					completedItems = progress.completedItems;
					BUS_ExternalTrackingExportProgress.next({
						provider,
						completedItems: progress.completedItems,
						totalItems:     progress.totalItems,
						active:         true,
					});
				}),
				defaultIfEmpty(null),
			));
		} else {
			await client.pushWatchedBatch(
				accountSecret,
				items,
			);
		}
		UserDbFacade.externalTracking.acknowledgePendingExports(
			provider,
			items,
		);
		const skippedCount = pendingItems.length - itemCount;
		if (skippedCount > 0) {
			return {
				success: false,
				message: `Export incomplete: ${ itemCount } anime updated on ${ providerLabel }; ${ skippedCount } lack a compatible identifier.`,
			};
		}
		return {
			success: true,
			message: `Export complete: ${ itemCount } anime updated on ${ providerLabel }.`,
		};
	} catch (error) {
		const typedError = typeSafeError(error);
		const message    = getExternalTrackingErrorMessage(typedError);
		LoggerUtils.logMainServiceError(
			"external-tracking.exportProvider",
			typedError,
			{
				provider,
				itemCount,
			},
		);
		return {
			success: false,
			message: `Export failed: ${ message }`,
		};
	} finally {
		if (progressActive) {
			BUS_ExternalTrackingExportProgress.next({
				provider,
				completedItems,
				totalItems: itemCount,
				active:     false,
			});
		}
	}
}
