// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import {
	canMarkAnimeDbDownloadCanceledImmediately,
	shouldTreatAnimeDbDownloadFailureAsCanceled,
} from "./anime-db-download-failure-policy";

describe(
	"anime-db-download-failure-policy",
	() => {
		it(
			"treats cancellation as cancel only before a protected integrity phase starts",
			() => {
				expect(shouldTreatAnimeDbDownloadFailureAsCanceled({
					cancellationRequested: true,
					protectedPhaseStarted: false,
				})).toBe(true);
				expect(shouldTreatAnimeDbDownloadFailureAsCanceled({
					cancellationRequested: true,
					protectedPhaseStarted: true,
				})).toBe(false);
				expect(shouldTreatAnimeDbDownloadFailureAsCanceled({
					cancellationRequested: false,
					protectedPhaseStarted: false,
				})).toBe(false);
			},
		);

		it(
			"keeps replacement and reconcile visible because protected phases cannot be safely canceled",
			() => {
				expect(canMarkAnimeDbDownloadCanceledImmediately("downloading")).toBe(true);
				expect(canMarkAnimeDbDownloadCanceledImmediately("verifying")).toBe(true);
				expect(canMarkAnimeDbDownloadCanceledImmediately("replacing")).toBe(false);
				expect(canMarkAnimeDbDownloadCanceledImmediately("reconciling")).toBe(false);
			},
		);
	},
);
