const fs            = require("node:fs");
const path          = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot      = path.resolve(
	__dirname,
	"..",
	"..",
);
const allowlistPath = path.join(
	__dirname,
	"unused-export-allowlist.json",
);

function loadAllowlist() {
	const parsed = JSON.parse(fs.readFileSync(
		allowlistPath,
		"utf8",
	));
	return new Map(parsed.map((entry) => [
		entry.key,
		entry.reason,
	]));
}

function runKnip() {
	const knipBin = path.join(
		repoRoot,
		"node_modules",
		"knip",
		"bin",
		"knip.js",
	);
	const result  = spawnSync(
		process.execPath,
		[
			knipBin,
			"--reporter",
			"json",
		],
		{
			cwd:      repoRoot,
			encoding: "utf8",
		},
	);

	if (result.error) {
		throw result.error;
	}

	if (!result.stdout.trim()) {
		throw new Error(result.stderr || "Knip produced no JSON output.");
	}

	return JSON.parse(result.stdout);
}

function shouldAuditFile(file) {
	return file?.startsWith("src/")
		&& !file.includes("/index.ts")
		&& !file.startsWith("src/shared/types/")
		&& !file.endsWith(".test.ts")
		&& !file.endsWith(".test.tsx");
}

function collectAuditedIssues(report) {
	const issues = [];

	for (const issue of report.issues || []) {
		const file = issue.file;
		if (!shouldAuditFile(file)) {
			continue;
		}

		for (const item of issue.exports || []) {
			issues.push(`${ file }:export:${ item.name }`);
		}

		for (const item of issue.types || []) {
			issues.push(`${ file }:type:${ item.name }`);
		}
	}

	return issues.sort();
}

const allowlist             = loadAllowlist();
const issues                = collectAuditedIssues(runKnip());
const issueSet              = new Set(issues);
const unexpected            = issues.filter((key) => !allowlist.has(key));
const staleAllowlistEntries = [ ...allowlist.keys() ].filter((key) => !issueSet.has(key));

if (unexpected.length || staleAllowlistEntries.length) {
	if (unexpected.length) {
		console.error("Unexpected unused exports/types:");
		unexpected.forEach((key) => console.error(`- ${ key }`));
	}

	if (staleAllowlistEntries.length) {
		console.error("Stale unused-export allowlist entries:");
		staleAllowlistEntries.forEach((key) => console.error(`- ${ key }`));
	}

	process.exitCode = 1;
} else {
	console.log(`Unused export audit passed (${ issues.length } intentional entries).`);
}
