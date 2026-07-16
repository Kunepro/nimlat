import {
	BUS_ExternalTrackingAccountsChanged,
	BUS_GroupListChanged,
	BUS_GroupMediaItemsPatched,
	BUS_GroupMediaListChanged,
	BUS_MediaEpisodesItemsPatched,
	BUS_MediaWatchListChanged,
} from "@nimlat/busses/main";
import { UserDbFacade } from "@nimlat/database";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import type {
	ExternalTrackingImportedMedia,
	ExternalTrackingImportResult,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import { getExternalTrackingProviderLabel } from "./external-tracking-auth-flow";
import {
	getExternalTrackingErrorMessage,
	getExternalTrackingProviderClient,
} from "./external-tracking-provider-clients";
import { decryptExternalTrackingAccountSecret } from "./external-tracking-secret-storage";

interface RunExternalTrackingImportOptions {
	loadItems: () => Promise<ExternalTrackingImportedMedia[]>;
	markAccountError: boolean;
	logEvent: string;
	publicProfileIdentifier?: string;
}

async function runExternalTrackingImport(
	provider: ExternalTrackingProvider,
	options: RunExternalTrackingImportOptions,
): Promise<ExternalTrackingImportResult> {
	try {
		const items  = await options.loadItems();
		const result = UserDbFacade.externalTracking.applyImport(
			provider,
			items,
			{ publicProfileIdentifier: options.publicProfileIdentifier },
		);
		if (result.changedMediaIds.length > 0) {
			// Publish the exact persisted watch state before invalidating list readers.
			// Mounted Group cards can update immediately while the following reload
			// reconciles ordering, summaries, and any off-screen ranges from SQLite.
			BUS_GroupMediaItemsPatched.next({
				patches: result.changedMediaWatchStates,
			});
			const episodePatchesByMedia = new Map<number, Array<{ episodeNumber: number; isWatched: boolean }>>();
			for (const state of result.changedEpisodeWatchStates) {
				const patches = episodePatchesByMedia.get(state.mediaId) ?? [];
				patches.push({
					episodeNumber: state.episodeNumber,
					isWatched:     state.isWatched,
				});
				episodePatchesByMedia.set(
					state.mediaId,
					patches,
				);
			}
			for (const [ mediaId, patches ] of episodePatchesByMedia) {
				BUS_MediaEpisodesItemsPatched.next({
					mediaId,
					patches,
				});
			}
			BUS_MediaWatchListChanged.next({
				mediaIds: result.changedMediaIds,
			});
			BUS_GroupMediaListChanged.next({ affectedMediaIds: result.changedMediaIds });
			BUS_GroupListChanged.next({});
		}
		BUS_ExternalTrackingAccountsChanged.next({ provider });
		return {
			success:           true,
			message: `Import complete: matched ${ result.matchedItems } of ${ result.importedItems } anime in your Nimlat library.`,
			importedItems:     result.importedItems,
			matchedItems:      result.matchedItems,
			localUpdatedItems: result.localUpdatedItems,
		};
	} catch (error) {
		const typedError = typeSafeError(error);
		const message    = getExternalTrackingErrorMessage(typedError);
		if (options.markAccountError) {
			UserDbFacade.externalTracking.markAccountError(
				provider,
				message,
			);
		}
		LoggerUtils.logMainServiceError(
			options.logEvent,
			typedError,
			{ provider },
		);
		BUS_ExternalTrackingAccountsChanged.next({ provider });
		return {
			success:           false,
			message,
			importedItems:     0,
			matchedItems:      0,
			localUpdatedItems: 0,
		};
	}
}

// Owns import orchestration. The IPC service delegates here so account error
// state and watch-list BUS emission stay consistent with the committed DB write.
export async function importExternalTrackingProvider(provider: ExternalTrackingProvider): Promise<ExternalTrackingImportResult> {
	return runExternalTrackingImport(
		provider,
		{
			markAccountError: true,
			logEvent:         "external-tracking.importProvider",
			loadItems:        async () => {
				const account = UserDbFacade.externalTracking.getAccountSecret(provider);
				if (!account || account.status !== "connected") {
					throw new Error(`${ getExternalTrackingProviderLabel(provider) } is not connected.`);
				}
				return getExternalTrackingProviderClient(provider).importWatched(decryptExternalTrackingAccountSecret(account));
			},
		},
	);
}

export function importExternalTrackingFromLoader(
	provider: ExternalTrackingProvider,
	loadItems: () => Promise<ExternalTrackingImportedMedia[]>,
	logEvent: string,
	options: Pick<RunExternalTrackingImportOptions, "publicProfileIdentifier"> = {},
): Promise<ExternalTrackingImportResult> {
	return runExternalTrackingImport(
		provider,
		{
			markAccountError: false,
			logEvent,
			loadItems,
			...options,
		},
	);
}
