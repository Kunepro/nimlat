// @vitest-environment node
import type { UserGroupingStateDto } from "@nimlat/types/anime-db";
import {
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import {
	getFailedInstalledAnimeDbUserGroupingReconcileVersion,
	reconcileUserGroupingAfterAnimeDbInstallIfNeeded,
} from "./anime-db-post-install-reconcile";

const mocks = vi.hoisted(() => ({
	getAnimeDbVersion:  vi.fn<() => string | null | undefined>(),
	getGroupingState:   vi.fn<() => UserGroupingStateDto>(),
	isAdminModeEnabled: vi.fn<() => boolean>(),
	runSafeApply:       vi.fn(),
}));

vi.mock(
	"@nimlat/database",
	() => ({
		UserDbFacade: {
			config:   {
				getAnimeDbVersion:  mocks.getAnimeDbVersion,
				isAdminModeEnabled: mocks.isAdminModeEnabled,
			},
			grouping: {
				getState: mocks.getGroupingState,
			},
		},
	}),
);

vi.mock(
	"../group/group-reconcile-apply-service",
	() => ({
		GroupReconcileApplyService: {
			runSafeApply: mocks.runSafeApply,
		},
	}),
);

const BASE_STATE: UserGroupingStateDto = {
	id:                           1,
	groupingMode:                 "user",
	forkedFromAnimeDbVersion:     "v1",
	lastReconciledAnimeDbVersion: null,
	lastReconciledAt:             null,
	lastReconcileStatus:          null,
	lastReconcileSummaryJson:     null,
};

describe(
	"anime-db-post-install-reconcile",
	() => {
		beforeEach(() => {
			vi.clearAllMocks();
			mocks.getAnimeDbVersion.mockReturnValue("v2");
			mocks.getGroupingState.mockReturnValue(BASE_STATE);
			mocks.isAdminModeEnabled.mockReturnValue(false);
			mocks.runSafeApply.mockReturnValue({ runId: 10 });
		});

		it.each([
			{
				name:  "anime grouping mode",
				admin: false,
				state: {
					...BASE_STATE,
					groupingMode: "anime" as const,
				},
			},
			{
				name:  "admin mode",
				admin: true,
				state: BASE_STATE,
			},
			{
				name:  "a fresh fork from the installed release",
				admin: false,
				state: {
					...BASE_STATE,
					forkedFromAnimeDbVersion: "v2",
				},
			},
			{
				name:  "an already completed reconcile for the installed release",
				admin: false,
				state: {
					...BASE_STATE,
					lastReconciledAnimeDbVersion: "v2",
					lastReconcileStatus:          "completed",
				},
			},
		])(
			"skips $name",
			({
				 admin,
				 state,
			 }) => {
				mocks.isAdminModeEnabled.mockReturnValue(admin);
				mocks.getGroupingState.mockReturnValue(state);

				expect(reconcileUserGroupingAfterAnimeDbInstallIfNeeded("v2")).toBeNull();
				expect(mocks.runSafeApply).not.toHaveBeenCalled();
			},
		);

		it.each([
			{
				name:  "a fork from an older release",
				state: BASE_STATE,
			},
			{
				name:  "a completed reconcile for an older release",
				state: {
					...BASE_STATE,
					lastReconciledAnimeDbVersion: "v1.5",
					lastReconcileStatus:          "completed",
				},
			},
			{
				name:  "a failed reconcile for the current release",
				state: {
					...BASE_STATE,
					lastReconciledAnimeDbVersion: "v2",
					lastReconcileStatus:          "failed",
				},
			},
			{
				name:  "an interrupted or unknown reconcile state",
				state: {
					...BASE_STATE,
					forkedFromAnimeDbVersion: "v2",
					lastReconcileStatus:      "running",
				},
			},
		])(
			"runs safe apply for $name",
			({ state }) => {
				mocks.getGroupingState.mockReturnValue(state);

				const result = reconcileUserGroupingAfterAnimeDbInstallIfNeeded("v2");

				expect(result).toEqual({ runId: 10 });
				expect(mocks.runSafeApply).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"finds an exact failed installed target for network-independent retry",
			() => {
				mocks.getGroupingState.mockReturnValue({
					...BASE_STATE,
					lastReconciledAnimeDbVersion: "v2",
					lastReconcileStatus:          "failed",
				});

				expect(getFailedInstalledAnimeDbUserGroupingReconcileVersion()).toBe("v2");
			},
		);

		it.each([
			{
				name:             "admin mode",
				admin:            true,
				installedVersion: "v2",
				state:            {
					...BASE_STATE,
					lastReconciledAnimeDbVersion: "v2",
					lastReconcileStatus:          "failed",
				},
			},
			{
				name:             "a completed reconcile",
				admin:            false,
				installedVersion: "v2",
				state:            {
					...BASE_STATE,
					lastReconciledAnimeDbVersion: "v2",
					lastReconcileStatus:          "completed",
				},
			},
			{
				name:             "a failed target different from the installed version",
				admin:            false,
				installedVersion: "v3",
				state:            {
					...BASE_STATE,
					lastReconciledAnimeDbVersion: "v2",
					lastReconcileStatus:          "failed",
				},
			},
		])(
			"does not offer local retry for $name",
			({
				 admin,
				 installedVersion,
				 state,
			 }) => {
				mocks.isAdminModeEnabled.mockReturnValue(admin);
				mocks.getAnimeDbVersion.mockReturnValue(installedVersion);
				mocks.getGroupingState.mockReturnValue(state);

				expect(getFailedInstalledAnimeDbUserGroupingReconcileVersion()).toBeNull();
			},
		);

		it(
			"refuses to reconcile when the attached AnimeDB version stamp does not match the target",
			() => {
				mocks.getAnimeDbVersion.mockReturnValue("v3");

				expect(() => reconcileUserGroupingAfterAnimeDbInstallIfNeeded("v2")).toThrow(
					"Cannot reconcile user grouping for AnimeDB v2 while v3 is installed.",
				);
				expect(mocks.runSafeApply).not.toHaveBeenCalled();
			},
		);

		it(
			"rejects an empty target version before applying grouping changes",
			() => {
				expect(() => reconcileUserGroupingAfterAnimeDbInstallIfNeeded("  ")).toThrow(
					"Post-install grouping reconcile requires a target AnimeDB version.",
				);
				expect(mocks.runSafeApply).not.toHaveBeenCalled();
			},
		);
	},
);
