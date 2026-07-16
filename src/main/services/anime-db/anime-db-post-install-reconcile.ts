import { UserDbFacade } from "@nimlat/database";
import type { UserGroupingStateDto } from "@nimlat/types/anime-db";
import type { ReconcileApplySummaryReport } from "@nimlat/types/anime-db-reconcile";
import { GroupReconcileApplyService } from "../group/group-reconcile-apply-service";

// Automatic reconcile is intentionally limited to consumer-owned grouping. Admin
// mode edits the distributable AnimeDB directly and must not mutate a dormant user
// snapshot as a side effect of installing or inspecting a release asset.
function shouldReconcileUserGroupingAfterAnimeDbInstall(params: {
	adminModeEnabled: boolean;
	state: UserGroupingStateDto;
	targetVersion: string;
}): boolean {
	if (params.adminModeEnabled || params.state.groupingMode !== "user") {
		return false;
	}

	const targetVersion = params.targetVersion.trim();
	if (targetVersion.length === 0) {
		throw new Error("Post-install grouping reconcile requires a target AnimeDB version.");
	}

	if (params.state.lastReconcileStatus === "completed") {
		return params.state.lastReconciledAnimeDbVersion !== targetVersion;
	}

	// Failed, interrupted, or unknown reconcile states are always retryable. A
	// never-reconciled fork is current only when it was created from this release.
	return params.state.lastReconcileStatus != null
		|| params.state.forkedFromAnimeDbVersion !== targetVersion;
}

export function needsAnimeDbUserGroupingReconcile(targetVersion: string): boolean {
	return shouldReconcileUserGroupingAfterAnimeDbInstall({
		adminModeEnabled: UserDbFacade.config.isAdminModeEnabled(),
		state:            UserDbFacade.grouping.getState(),
		targetVersion,
	});
}

// A failed apply records its exact installed target in user_data. Surface only
// that state for network-independent retry; ordinary outdated snapshots should
// still resolve the latest release before deciding which version to reconcile.
export function getFailedInstalledAnimeDbUserGroupingReconcileVersion(): string | null {
	if (UserDbFacade.config.isAdminModeEnabled()) {
		return null;
	}

	const state = UserDbFacade.grouping.getState();
	if (state.groupingMode !== "user" || state.lastReconcileStatus !== "failed") {
		return null;
	}

	const installedVersion = UserDbFacade.config.getAnimeDbVersion()?.trim() ?? "";
	return installedVersion.length > 0
	&& state.lastReconciledAnimeDbVersion === installedVersion
		? installedVersion
		: null;
}

// Re-check both policy and the installed-version stamp immediately before apply.
// This prevents a stale release-resolution result from reconciling user_data
// against a different AnimeDB than the one currently attached.
export function reconcileUserGroupingAfterAnimeDbInstallIfNeeded(
	targetVersion: string,
): ReconcileApplySummaryReport | null {
	if (!needsAnimeDbUserGroupingReconcile(targetVersion)) {
		return null;
	}

	const installedVersion = UserDbFacade.config.getAnimeDbVersion()?.trim() ?? null;
	if (installedVersion !== targetVersion.trim()) {
		throw new Error(
			`Cannot reconcile user grouping for AnimeDB ${ targetVersion } while ${ installedVersion ?? "no version" } is installed.`,
		);
	}

	return GroupReconcileApplyService.runSafeApply();
}
