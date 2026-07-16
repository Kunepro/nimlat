import type {
	ExternalTrackingImportedMedia,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import {
	applyExternalTrackingImport,
	type ExternalTrackingImportApplyOptions,
	type ExternalTrackingImportApplyResult,
} from "./external-tracking/user-external-tracking";
import { runUserDbFacadeOperation } from "./user-db-facade-utils";

// Import facade for provider snapshots. Result/error activity is already kept on
// the provider account, so the DB owns only the atomic watched-state replacement.
export const UserDbExternalTrackingImportFacade = {
	applyImport: (
								 provider: ExternalTrackingProvider,
		             items: ExternalTrackingImportedMedia[],
		             options: ExternalTrackingImportApplyOptions,
							 ): ExternalTrackingImportApplyResult => {
		return runUserDbFacadeOperation(
			"user-db.facade.externalTracking.applyImport",
			() => applyExternalTrackingImport(
				provider,
				items,
				options,
			),
			{
				provider,
				itemCount: items.length,
			},
		);
	},
} as const;
