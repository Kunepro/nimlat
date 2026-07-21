const { spawnSync } = require("node:child_process");
const {
				existsSync,
				readFileSync,
				rmSync,
			}             = require("node:fs");
const { join }      = require("node:path");

// Run the Electron DB smoke harness in a shell-agnostic way. This avoids
// Windows/PowerShell differences while still returning the actual child exit code.
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
	// GitHub's Linux runner cannot install Electron's setuid sandbox helper. Keep
	// this exception scoped to the CI smoke harness; packaged applications remain sandboxed.
	const electronArguments = [
		...(process.env.CI === "true" && process.platform === "linux" ? [ "--no-sandbox" ] : []),
		join(
			"tools",
			"smoke",
			"electron-entry.cjs",
		),
	];
	const result            = spawnSync(
		process.execPath,
		[
			join(
				"node_modules",
				"electron",
				"cli.js",
			),
			...electronArguments,
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
