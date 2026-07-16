import commonjs from "@rollup/plugin-commonjs";
import replace from "@rollup/plugin-replace";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import electron from "vite-plugin-electron";

// Shared alias configuration based on tsconfig.json paths
const aliases = {
	"@nimlat/types":            path.resolve(
		__dirname,
		"./src/shared/types",
	),
	"@nimlat/functions":        path.resolve(
		__dirname,
		"./src/shared/functions/index.ts",
	),
	"@nimlat/busses/main":      path.resolve(
		__dirname,
		"./src/busses/main/index.ts",
	),
	"@nimlat/busses/renderer":  path.resolve(
		__dirname,
		"./src/busses/renderer/index.ts",
	),
	"@nimlat/loggers/main":     path.resolve(
		__dirname,
		"./src/loggers/main/index.ts",
	),
	"@nimlat/loggers/renderer": path.resolve(
		__dirname,
		"./src/loggers/renderer/index.ts",
	),
	"@nimlat/constants/main":   path.resolve(
		__dirname,
		"./src/constants/main",
	),
	// It is important that this comes after the more specific main namespace.
	"@nimlat/constants":  path.resolve(
		__dirname,
		"./src/shared/constants",
	),
	"@nimlat/components": path.resolve(
		__dirname,
		"./src/renderer/components/index.ts",
	),
	"@nimlat/database":   path.resolve(
		__dirname,
		"./src/database/index.ts",
	),
};

const ELECTRON_DEV_RESTART_MESSAGE = "nimlat-dev-restart";
let isElectronDevRestarting        = false;

function waitForElectronAppExit(electronApp) {
	return new Promise((resolve) => {
		const timeout = setTimeout(
			() => {
				electronApp.off(
					"exit",
					handleExit,
				);
				resolve(false);
			},
			5000,
		);

		function handleExit() {
			clearTimeout(timeout);
			resolve(true);
		}

		electronApp.once(
			"exit",
			handleExit,
		);
	});
}

async function quitElectronAppGracefully() {
	const electronApp = process.electronApp;
	if (!electronApp || electronApp.exitCode !== null) {
		return true;
	}

	// vite-plugin-electron kills the whole process tree on restart by default.
	// Asking Electron to quit itself lets BrowserWindow/app shutdown handlers run
	// and prevents Chromium child processes from logging SIGTERM crashes on macOS.
	// The plugin also wires Electron's exit to Vite's process.exit; clear that
	// listener first so a normal dev restart does not stop the Vite watcher.
	electronApp.removeListener(
		"exit",
		process.exit,
	);

	try {
		electronApp.send?.(ELECTRON_DEV_RESTART_MESSAGE);
	} catch {
		return false;
	}

	return waitForElectronAppExit(electronApp);
}

async function handleElectronDevStart({ startup }) {
	if (isElectronDevRestarting) {
		return;
	}

	isElectronDevRestarting = true;
	try {
		const didExitGracefully = await quitElectronAppGracefully();
		if (didExitGracefully) {
			process.electronApp = undefined;
		}

		startup();
	} finally {
		isElectronDevRestarting = false;
	}
}

export default defineConfig({
	plugins:      [
		react({
			jsxRuntime: "automatic",
		}),
		replace({
			"process.env.NODE_ENV": "\"production\"",
			preventAssignment:      true,
		}),
		electron([
			{
				entry: "src/main/main.ts",
				onstart: handleElectronDevStart,
				vite:  {
					build:        {
						outDir:        "dist",
						sourcemap:     true,
						rollupOptions: {
							output:   {
								format:         "cjs",
								entryFileNames: "[name].js",
							},
							external: [
								"better-sqlite3",
								"electron",
								"electron-updater",
								"rxjs",
								"rxjs/operators",
								"p-queue",
								"eventemitter3",
								"@octokit/rest",
								"@octokit/request",
								"fast-content-type-parse",
							],
							plugins:  [
								commonjs({
									dynamicRequireTargets: [
										"node_modules/better-sqlite3/build/Release/better_sqlite3.node",
									],
									include:               /node_modules/,
								}),
							],
						},
					},
					resolve:      {
						conditions: [ "node" ],
						mainFields: [
							"module",
							"jsnext:main",
							"main",
						],
						alias:      aliases,
					},
					optimizeDeps: {
						include: [ "rxjs" ],
					},
				},
			},
			{
				entry: "src/preload/preload.ts",
				onstart: handleElectronDevStart,
				vite:  {
					build:   {
						outDir:        "dist",
						sourcemap:     true,
						rollupOptions: {
							output:   {
								format:         "cjs",
								entryFileNames: "[name].js",
							},
							external: [ "electron" ],
						},
					},
					resolve: {
						conditions: [ "node" ],
						mainFields: [
							"module",
							"jsnext:main",
							"main",
						],
						alias:      aliases,
					},
				},
			},
		]),
	],
	base:         "./",
	build:        {
		outDir:        "dist",
		sourcemap:     true,
		cssCodeSplit:  false,
		rollupOptions: {
			input:  {
				index: "index.html",
			},
			output: {
				format:         "es",
				entryFileNames: "assets/[name]-[hash].js",
			},
		},
	},
	resolve:      {
		alias: {
			...aliases,
			react:               "react",
			"react-dom":         "react-dom",
			"react/jsx-runtime": "react/jsx-runtime",
			"@my-app-types":     path.resolve(
				__dirname,
				"./src/shared/types",
			),
		},
	},
	optimizeDeps: {
		esbuildOptions: {
			mainFields:        [
				"module",
				"main",
			],
			resolveExtensions: [
				".mjs",
				".js",
				".ts",
				".jsx",
				".tsx",
			],
		},
	},
	define:       {
		"process.env.NODE_ENV": "\"production\"",
		"process.env":          { NODE_ENV: "\"production\"" },
	},
	test:         {
		include:     [ "src/**/*.{test,spec}.{ts,tsx}" ],
		globals:     true,
		environment: "jsdom",
	},
});
