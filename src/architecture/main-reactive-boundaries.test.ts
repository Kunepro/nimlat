// @vitest-environment node

import { join } from "node:path";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	findViolations,
	listSourceFiles,
	sourceRoot,
	stripCommentsAndStrings,
} from "./architecture-boundary-test-utils";

describe(
	"main process reactive architecture boundaries",
	() => {
		const allSourceFiles = listSourceFiles(sourceRoot);

		it(
			"keeps main workflow progress reactive instead of callback-sink based",
			() => {
				const guardedRoots = [
					join(
						sourceRoot,
						"main",
						"api",
					),
					join(
						sourceRoot,
						"main",
						"daemons",
					),
					join(
						sourceRoot,
						"main",
						"services",
					),
				];
				const guardedFiles = allSourceFiles.filter((file) =>
					guardedRoots.some((root) => file.startsWith(root))
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						if (/\bEventSink\b/.test(executableSource)) {
							return "defines an EventSink callback contract instead of returning an Observable/BUS event stream";
						}
						if (/\bevents\s*:\s*\{\s*next\s*\(/.test(executableSource)) {
							return "accepts a callback-style event sink instead of returning an Observable/BUS event stream";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps external-tracking export progress on Observable streams",
			() => {
				const guardedFiles = [
					join(
						sourceRoot,
						"main",
						"services",
						"external-tracking",
						"external-tracking-providers.ts",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"external-tracking",
						"external-tracking-kitsu-client.ts",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"external-tracking",
						"external-tracking-manual-export-service.ts",
					),
				];
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bExternalTrackingPushProgressReporter\b|\breportProgress\b/.test(stripCommentsAndStrings(source))
						? "uses callback-shaped external-tracking export progress instead of an Observable stream"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps long-running main schedulers on RxJS intervals instead of raw intervals",
			() => {
				const guardedRoots = [
					join(
						sourceRoot,
						"main",
						"daemons",
					),
					join(
						sourceRoot,
						"main",
						"services",
					),
				];
				const guardedFiles = allSourceFiles.filter((file) =>
					guardedRoots.some((root) => file.startsWith(root))
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bsetInterval\s*\(/.test(stripCommentsAndStrings(source))
						? "uses raw setInterval; model recurring process triggers with RxJS interval/merge/exhaustMap so shutdown and overlap behavior stay explicit"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps paginated AniList hydrator fetch progress on event streams",
			() => {
				const guardedFiles = [
					join(
						sourceRoot,
						"main",
						"api",
						"ani-list-api.ts",
					),
					join(
						sourceRoot,
						"main",
						"api",
						"ani-list",
						"characters",
						"ani-list-characters-fetcher.ts",
					),
					join(
						sourceRoot,
						"main",
						"api",
						"ani-list",
						"staff",
						"ani-list-staff-fetcher.ts",
					),
					join(
						sourceRoot,
						"main",
						"daemons",
						"media-hydrator",
						"daemons",
						"group-characters-daemon.ts",
					),
					join(
						sourceRoot,
						"main",
						"daemons",
						"media-hydrator",
						"daemons",
						"group-staff-daemon.ts",
					),
				];
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bonPageRequested\b|\bOnCharactersPageRequested\b|\bOnStaffPageRequested\b/.test(stripCommentsAndStrings(source))
						? "uses the retired callback progress contract instead of the AniList paged event stream"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps GitHub release asset download progress on event streams",
			() => {
				const guardedFiles = [
					join(
						sourceRoot,
						"shared",
						"types",
						"github-release-asset-download.ts",
					),
					join(
						sourceRoot,
						"main",
						"api",
						"github-revisions-api.ts",
					),
					join(
						sourceRoot,
						"main",
						"api",
						"github-revisions",
						"download-release-asset.ts",
					),
					join(
						sourceRoot,
						"main",
						"api",
						"github-revisions",
						"download-release-asset-progress.ts",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"anime-db",
						"anime-db-download-runner.ts",
					),
				];
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bonProgress\b/.test(stripCommentsAndStrings(source))
						? "uses the retired release-asset progress callback instead of the download event stream"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps AnimeDB populate worker progress on event streams",
			() => {
				const guardedFiles = [
					join(
						sourceRoot,
						"main",
						"services",
						"anime-db",
						"populate-anime-db.ts",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"anime-db",
						"anime-db-populate-batch-processor.ts",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"anime-db",
						"anime-db-populate-scan-runner.ts",
					),
				];
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bonBatchProgress\b|\bonBatchCommitted\b|\bonMediaPersisted\b/.test(stripCommentsAndStrings(source))
						? "uses retired populate callbacks instead of scan/batch event streams"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps AnimeDB updater worker progress on event streams",
			() => {
				const guardedFiles = [
					join(
						sourceRoot,
						"main",
						"services",
						"anime-db",
						"anime-db-updater.ts",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"anime-db",
						"anime-db-update-batch-processor.ts",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"anime-db",
						"anime-db-update-sweep-runner.ts",
					),
				];
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bonUpdatedAtSweepStarted\b|\bonTailSweepStarted\b|\bonPageProgress\b|\bonMediaIngested\b|\bingestMediaBatch\b/.test(stripCommentsAndStrings(source))
						? "uses retired updater callbacks instead of sweep/batch event streams"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps AniList rate limiter delayed transitions on owned RxJS timers",
			() => {
				const rateLimiterFile = join(
					sourceRoot,
					"main",
					"api",
					"ani-list",
					"ani-list.rate-limiter.singleton.ts",
				);
				const violations      = findViolations(
					[ rateLimiterFile ],
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						if (/\bsetTimeout\b|\bclearTimeout\b|\bNodeJS\.Timeout\b/.test(executableSource)) {
							return "uses manual timeout fields instead of named RxJS timer subscriptions";
						}
						if (!/\btimer\s*\(/.test(executableSource) || !/\bscheduledTimers\b/.test(executableSource)) {
							return "does not model delayed queue transitions through owned RxJS timer subscriptions";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps AnimeDB retry waits on cancellable RxJS delay signals",
			() => {
				const retryDelayControllerFile = join(
					sourceRoot,
					"main",
					"services",
					"anime-db",
					"retry-delay-controller.ts",
				);
				const violations               = findViolations(
					[ retryDelayControllerFile ],
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						if (/\bsetTimeout\b|\bclearTimeout\b|\bNodeJS\.Timeout\b/.test(executableSource)) {
							return "uses manual timeout fields instead of cancellable RxJS delay signals";
						}
						if (!/\brace\s*\(/.test(executableSource) || !/\btimer\s*\(/.test(executableSource)) {
							return "does not race retry delay against an explicit cancellation signal";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps window bounds persistence on debounced RxJS event streams",
			() => {
				const windowBoundsFile = join(
					sourceRoot,
					"main",
					"init",
					"persist-window-bounds.ts",
				);
				const violations       = findViolations(
					[ windowBoundsFile ],
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						if (/\bsetTimeout\b|\bclearTimeout\b|\bNodeJS\.Timeout\b/.test(executableSource)) {
							return "uses manual debounce timers instead of a debounced event stream";
						}
						if (!/\bfromEvent\s*\(/.test(executableSource) || !/\bdebounceTime\s*\(/.test(executableSource)) {
							return "does not model noisy window events as a debounced RxJS stream";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps media hydrator daemon scheduling on owned RxJS subscriptions",
			() => {
				const daemonManagerFile = join(
					sourceRoot,
					"main",
					"daemons",
					"media-hydrator",
					"daemon-manager.ts",
				);
				const violations        = findViolations(
					[ daemonManagerFile ],
					(source) => /\bsetInterval\b|\bclearInterval\b|\bsetTimeout\b|\bclearTimeout\b|\bhydratorQueueChangesSubscription\b/.test(stripCommentsAndStrings(source))
						? "uses retired manual daemon timers/subscription fields instead of owned RxJS scheduler subscriptions"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps the release-watch polling daemon on an explicit owned subscription",
			() => {
				const guardedFiles = [
					join(
						sourceRoot,
						"main",
						"daemons",
						"release-watch-daemon.ts",
					),
				];
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bdisposed\$\b|\bnew\s+Subject\b|\btakeUntil\b/.test(stripCommentsAndStrings(source))
						? "uses retired disposed$ Subject lifecycle instead of an explicit owned Subscription"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);
	},
);
