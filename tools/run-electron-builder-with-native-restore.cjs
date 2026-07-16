const { spawnSync } = require("node:child_process");
const { join }      = require("node:path");

const electronBuilderCli = join(
	__dirname,
	"..",
	"node_modules",
	"electron-builder",
	"cli.js",
);

// Launch the installed JavaScript entry point directly so Windows does not
// depend on child-process handling of npm.cmd, which fails on newer Node versions.
function runElectronBuilder(args) {
	return spawnSync(
		process.execPath,
		[
			electronBuilderCli,
			...args,
		],
		{ stdio: "inherit" },
	);
}

function statusOf(result) {
	if (result.error) {
		console.error(result.error.stack || result.error);
		return 1;
	}
	return result.status ?? 1;
}

// electron-builder rebuilds native modules per target architecture. Multi-arch
// macOS packaging can leave node_modules/better-sqlite3 on the last packaged
// arch, which breaks local Electron E2E/dev runs on the host arch.
const buildResult = runElectronBuilder(process.argv.slice(2));

const restoreResult = runElectronBuilder([
	"install-app-deps",
	`--arch=${ process.arch }`,
]);

const buildStatus   = statusOf(buildResult);
const restoreStatus = statusOf(restoreResult);

process.exit(buildStatus || restoreStatus);
