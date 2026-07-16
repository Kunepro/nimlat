// @vitest-environment node

import { join } from "node:path";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	findRendererFacadeCallableViolations,
	findViolations,
	listSourceFiles,
	projectRoot,
	readSource,
	readTsConfigAliases,
	sourceRoot,
	stripCommentsAndStrings,
	toProjectPath,
} from "./architecture-boundary-test-utils";

describe(
	"renderer reactive architecture boundaries",
	() => {
		const allSourceFiles = listSourceFiles(sourceRoot);

		it(
			"keeps renderer canvas diagnostics consumers on the Observable service stream",
			() => {
				const rendererRoot       = join(
					sourceRoot,
					"renderer",
				);
				const preloadAdapterFile = join(
					rendererRoot,
					"services",
					"user-config-status-service.ts",
				);
				const guardedFiles       = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& file !== preloadAdapterFile
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations         = findViolations(
					guardedFiles,
					(source) => /\bonCanvasDiagnosticsStatusChanged\b/.test(stripCommentsAndStrings(source))
						? "uses the callback-shaped preload listener instead of UserConfigFacade.canvasDiagnosticsStatusChanges()"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps callback-shaped preload event listeners inside renderer services",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const servicesRoot = join(
					rendererRoot,
					"services",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !file.startsWith(servicesRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bwindow\.electronAPI\.[A-Za-z0-9_]+\s*\.\s*on[A-Z][A-Za-z0-9_]*\s*\(/.test(stripCommentsAndStrings(source))
						? "uses a callback-shaped preload event listener outside a renderer Observable service"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer user-config event consumers on Observable facade streams",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /UserConfigFacade\.on(?:AdultContentStatusChanged|BackgroundStyleChanged|PreferredTitleLanguageChanged)/.test(stripCommentsAndStrings(source))
						? "uses callback-shaped user-config listener instead of an Observable facade stream"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer download-search settings invalidation on the Observable service stream",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const violations   = findViolations(
					allSourceFiles.filter((file) =>
						file.startsWith(rendererRoot)
						&& !/\.test\.(ts|tsx)$/.test(file),
					),
					(source) => /\bonSettingsChanged\b/.test(stripCommentsAndStrings(source))
						? "uses callback-shaped settings invalidation instead of DownloadSearchFacade.settingsChanges()"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer process progress consumers on Observable facade streams",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /AnimeDbDownloadFacade\.onProgress|AnimeDbPopulationFacade\.onProgress|HydratorFacade\.onProgress|HydratorFacade\.onQueueChanged|AniListQueueStatusService\.subscribe/.test(stripCommentsAndStrings(source))
						? "uses retired callback-shaped renderer progress subscription instead of an Observable stream"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer network status consumers on the Observable service stream",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bnetworkStatusService\.subscribe\s*\(/.test(stripCommentsAndStrings(source))
						? "uses callback-shaped network status subscription instead of statusChanges()"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer facades as delegation-only panels",
			() => {
				const facadesRoot = join(
					sourceRoot,
					"renderer",
					"facades",
				);
				const facadeFiles = allSourceFiles.filter((file) =>
					file.startsWith(facadesRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations  = findViolations(
					facadeFiles,
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						if (/\b(if|else|switch|for|while|try|catch)\b/.test(executableSource)) {
							return "contains control-flow logic";
						}
						if (/@nimlat\/database|from\s+["'][^"']*(?:src\/main|src\/database|\.\.\/features|\.\.\/modals)/.test(source)) {
							return "imports implementation details instead of delegating";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer facade panels small enough to scan as control surfaces",
			() => {
				const maxRendererFacadeLines = 140;
				const facadesRoot            = join(
					sourceRoot,
					"renderer",
					"facades",
				);
				const facadeFiles            = allSourceFiles.filter((file) =>
					file.startsWith(facadesRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations             = facadeFiles.flatMap((file) => {
					const lineCount = readSource(file).split("\n").length;
					return lineCount > maxRendererFacadeLines
						? [ `${ toProjectPath(file) }: has ${ lineCount } lines; split the renderer facade by domain process` ]
						: [];
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer facade methods as single delegation returns",
			() => {
				const facadesRoot = join(
					sourceRoot,
					"renderer",
					"facades",
				);
				const facadeFiles = allSourceFiles.filter((file) =>
					file.startsWith(facadesRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations  = facadeFiles.flatMap((file) => {
					return findRendererFacadeCallableViolations(
						readSource(file),
						file,
					);
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer group explorer event consumers on Observable facade streams",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /GroupExplorerFacade\.on(?:GroupListChanged|GroupMediaListChanged|GroupMediaItemsPatched|MediaEpisodesListChanged|MediaEpisodesItemsPatched)/.test(stripCommentsAndStrings(source))
						? "uses callback-shaped group explorer listener instead of an Observable facade stream"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer domain event consumers on Observable facade streams",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /ReleaseWatchFacade\.on(?:PastListChanged|UpcomingListChanged)|AppUpdateFacade\.onStatusChanged|ExternalTrackingFacade\.onAccountsChanged/.test(stripCommentsAndStrings(source))
						? "uses callback-shaped domain listener instead of an Observable facade stream"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps AntD message usage behind the app-context adapter",
			() => {
				const rendererRoot   = join(
					sourceRoot,
					"renderer",
				);
				const appMessageHook = join(
					rendererRoot,
					"hooks",
					"useAppMessage.ts",
				);
				const guardedFiles   = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& file !== appMessageHook
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations     = findViolations(
					guardedFiles,
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						return /from\s+["']antd\/es\/message["']|import\s+\{\s*message\s*}\s+from\s+["']antd["']/.test(executableSource)
							? "imports AntD static message API instead of useAppMessage()"
							: null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps AntD modal and notification side effects on hook/context APIs",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						if (/\bnotification\.(?:success|error|warning|info|open|destroy)\s*\(/.test(executableSource)) {
							return "uses AntD static notification side effects instead of a hook/context notification API";
						}
						if (/\bModal\.(?:confirm|info|success|error|warning|destroyAll)\s*\(/.test(executableSource)) {
							return "uses AntD static modal side effects instead of a hook/context modal API";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer preload listener callbacks confined to event services",
			() => {
				const rendererRoot         = join(
					sourceRoot,
					"renderer",
				);
				const rendererServicesRoot = join(
					rendererRoot,
					"services",
				);
				const rendererFiles        = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations           = rendererFiles.flatMap((file) => {
					const executableSource         = stripCommentsAndStrings(readSource(file));
					const projectPath              = toProjectPath(file);
					const fileViolations: string[] = [];

					if (/\b[A-Za-z]+Facade\.on[A-Z][A-Za-z]+\b/.test(executableSource)) {
						fileViolations.push(`${ projectPath }: uses a callback-shaped facade listener instead of an Observable stream`);
					}
					if (/\bpublic\s+static\s+on[A-Z][A-Za-z]+\b/.test(executableSource)) {
						fileViolations.push(`${ projectPath }: exposes a callback-shaped renderer facade listener`);
					}
					if (!file.startsWith(rendererServicesRoot) && /\bwindow\.electronAPI\.[A-Za-z0-9_]+\.on[A-Z][A-Za-z]+\s*\(/.test(executableSource)) {
						fileViolations.push(`${ projectPath }: adapts a preload callback outside src/renderer/services`);
					}

					return fileViolations;
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer preload listener stream construction on the shared adapter",
			() => {
				const rendererServicesRoot = join(
					sourceRoot,
					"renderer",
					"services",
				);
				const preloadAdapterFile   = join(
					rendererServicesRoot,
					"preload-event-stream.ts",
				);
				const serviceFiles         = allSourceFiles.filter((file) =>
					file.startsWith(rendererServicesRoot)
					&& file !== preloadAdapterFile
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations           = findViolations(
					serviceFiles,
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						return /\bnew\s+Observable\b/.test(executableSource)
						&& /\bwindow\.electronAPI\.[A-Za-z0-9_]+\.on[A-Z][A-Za-z]+\s*\(/.test(executableSource)
							? "wraps a preload callback manually instead of using createSharedPreloadEventStream()"
							: null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer bus alias pointed at the renderer bus barrel",
			() => {
				const tsConfig        = readSource(join(
					projectRoot,
					"tsconfig.json",
				));
				const viteConfig      = readSource(join(
					projectRoot,
					"vite.config.js",
				));
				const tsConfigAliases = readTsConfigAliases(tsConfig);

				// The renderer bus alias is intentionally separate from the main bus.
				// If it points at main, renderer code can accidentally subscribe to
				// process-owned BUS objects instead of the renderer-facing action API.
				expect(tsConfigAliases[ "@nimlat/busses/renderer" ]).toEqual([ "./src/busses/renderer/index.ts" ]);
				expect(tsConfigAliases[ "@nimlat/constants/renderer/*" ]).toBeUndefined();
				expect(viteConfig).toMatch(/['"]@nimlat\/busses\/renderer['"]:\s*path\.resolve\(\s*__dirname,\s*['"]\.\/src\/busses\/renderer\/index\.ts['"],?\s*\)/);
				expect(viteConfig).not.toMatch(/['"]@nimlat\/busses\/renderer['"]:\s*path\.resolve\(\s*__dirname,\s*['"]\.\/src\/busses\/main\/index\.ts['"],?\s*\)/);
				expect(viteConfig).not.toMatch(/'@nimlat\/constants\/renderer'/);
			},
		);
	},
);
