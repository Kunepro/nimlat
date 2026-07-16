const { spawnSync } = require("node:child_process");
const {
				existsSync,
				readFileSync,
				rmSync,
			}             = require("node:fs");
const { join }      = require("node:path");

/**
 * Run the Electron DB smoke harness in a shell-agnostic way.
 * This avoids Windows/PowerShell differences around inline env assignment like
 * `set FOO=bar&& ...`, while still returning the actual child exit code.
 */
function main() {
	const runLogPath = join(
		process.cwd(),
		"tools",
		"smoke",
		".last-run.log",
	);
	rmSync(
		runLogPath,
		{
			force: true,
		},
	);
	const result = spawnSync(
		process.execPath,
		[
			join(
				"node_modules",
				"electron",
				"cli.js",
			),
			join(
				"tools",
				"smoke",
				"electron-entry.cjs",
			),
		],
		{
			cwd:   process.cwd(),
			stdio: "inherit",
			env:   {
				...process.env,
				TSX_DISABLE_CACHE: "1",
			},
		},
	);

	if (result.error) {
		console.error(
			"[smoke:db] launcher failed",
			result.error,
		);
		process.exit(1);
	}

	if (!existsSync(runLogPath)) {
		process.exit(result.status ?? 1);
	}

	const logContent = readFileSync(
		runLogPath,
		"utf8",
	).trim();
	const lastLine   = logContent.split(/\r?\n/).filter(Boolean).at(-1) ?? "";
	const output     = logContent
		.split(/\r?\n/)
		.filter(Boolean)
		.map((line) => `[smoke:db] ${ line }`)
		.join("\n");

	if (output) {
		process.stdout.write(`${ output }\n`);
	}

	process.exit(lastLine.endsWith("ok") ? 0 : 1);
}

main();
