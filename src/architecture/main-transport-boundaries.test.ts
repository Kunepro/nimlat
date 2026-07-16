// @vitest-environment node

import { join } from "node:path";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	findElectronBoundaryViolation,
	findIpcHandlerThinnessViolations,
	findViolations,
	listSourceFiles,
	readSource,
	sourceRoot,
	stripCommentsAndStrings,
	toProjectPath,
} from "./architecture-boundary-test-utils";

describe(
	"main process transport architecture boundaries",
	() => {
		const allSourceFiles = listSourceFiles(sourceRoot);

		it(
			"keeps Electron APIs limited to main, preload, and main-owned constants",
			() => {
				const architectureRoot = join(
					sourceRoot,
					"architecture",
				);
				const allowedRoots     = [
					join(
						sourceRoot,
						"main",
					),
					join(
						sourceRoot,
						"preload",
					),
					join(
						sourceRoot,
						"constants",
						"main",
					),
				];
				const guardedFiles     = allSourceFiles.filter((file) =>
					!allowedRoots.some((root) => file.startsWith(root))
					// Architecture tests intentionally contain forbidden tokens inside static scanners.
					&& !file.startsWith(architectureRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations       = findViolations(
					guardedFiles,
					findElectronBoundaryViolation,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps direct console output inside logger utilities",
			() => {
				const loggersRoot  = join(
					sourceRoot,
					"loggers",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					!file.startsWith(loggersRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bconsole\.(?:debug|error|info|log|warn)\s*\(/.test(stripCommentsAndStrings(source))
						? "writes directly to console instead of using logger utilities"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer IPC fan-out behind event bridges and IPC utilities",
			() => {
				const guardedRoots = [
					join(
						sourceRoot,
						"database",
					),
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
						if (/\b(?:ipcMain|ipcRenderer)\b/.test(executableSource)) {
							return "touches Electron IPC directly outside the IPC layer";
						}
						if (/\bbroadcastToRendererWindows\b/.test(executableSource)) {
							return "broadcasts directly instead of publishing a main-process BUS event";
						}
						if (/\b(?:webContents|mainFrame)\s*\.\s*send\b/.test(executableSource)) {
							return "sends directly to renderer instead of using a BUS -> IPC bridge";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer window broadcasts inside the shared IPC transport helpers",
			() => {
				const mainRoot            = join(
					sourceRoot,
					"main",
				);
				const mainBusEventBridge  = join(
					mainRoot,
					"ipc",
					"main-bus-event-bridge.ts",
				);
				const ipcBroadcastUtility = join(
					mainRoot,
					"utils",
					"ipc-broadcast.ts",
				);
				const guardedFiles        = allSourceFiles.filter((file) =>
					file.startsWith(mainRoot)
					&& file !== mainBusEventBridge
					&& file !== ipcBroadcastUtility
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations          = findViolations(
					guardedFiles,
					(source) => /\bbroadcastToRendererWindows\b/.test(stripCommentsAndStrings(source))
						? "broadcasts to renderer outside the shared IPC transport helpers"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps IPC handlers as single-call transport adapters",
			() => {
				const ipcRoot      = join(
					sourceRoot,
					"main",
					"ipc",
				);
				const handlerFiles = allSourceFiles.filter((file) =>
					file.startsWith(ipcRoot)
					&& /handlers\.ts$/.test(file),
				);
				const violations   = handlerFiles.flatMap((file) =>
					findIpcHandlerThinnessViolations(
						readSource(file),
						file,
					).map(violation => `${ toProjectPath(file) }: ${ violation }`),
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps main BUS event bridges on the shared RxJS bridge helper",
			() => {
				const ipcRoot          = join(
					sourceRoot,
					"main",
					"ipc",
				);
				const eventBridgeFiles = allSourceFiles.filter((file) =>
					file.startsWith(ipcRoot)
					&& /events-bridge\.ts$/.test(file),
				);
				const violations       = findViolations(
					eventBridgeFiles,
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						if (/\.subscribe\s*\(/.test(executableSource)) {
							return "subscribes directly instead of using main-bus-event-bridge";
						}
						if (/\bLoggerUtils\.logMainServiceError\b/.test(executableSource)) {
							return "owns bridge error logging instead of using main-bus-event-bridge";
						}
						if (/\bbroadcastToRendererWindows\b/.test(executableSource)) {
							return "broadcasts directly instead of using a notification helper";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps main BUS event bridge panels small enough to audit by channel family",
			() => {
				const maxEventBridgeLines = 140;
				const ipcRoot             = join(
					sourceRoot,
					"main",
					"ipc",
				);
				const eventBridgeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(ipcRoot)
					&& /events-bridge\.ts$/.test(file),
				);
				const violations          = eventBridgeFiles.flatMap((file) => {
					const lineCount = readSource(file).split("\n").length;
					return lineCount > maxEventBridgeLines
						? [ `${ toProjectPath(file) }: has ${ lineCount } lines; split the bridge by channel family` ]
						: [];
				});

				expect(violations).toEqual([]);
			},
		);
	},
);
