// Shared filesystem and project-path helpers for architecture boundary tests.
// Architecture test support is excluded from app scans because it intentionally contains forbidden static patterns.

import {
	readdirSync,
	readFileSync,
} from "node:fs";
import {
	join,
	relative,
} from "node:path";
import { cwd } from "node:process";

export const projectRoot = cwd();

export const sourceRoot = join(
	projectRoot,
	"src",
);

type TsConfigWithAliases = {
	compilerOptions: {
		paths: Record<string, string[]>;
	};
};

export function listSourceFiles(root: string): string[] {
	return readdirSync(
		root,
		{ withFileTypes: true },
	).flatMap((entry) => {
		const path = join(
			root,
			entry.name,
		);
		// These files intentionally contain forbidden tokens as static scan patterns.
		if (root === sourceRoot && entry.name === "architecture") {
			return [];
		}
		if (entry.isDirectory()) {
			return listSourceFiles(path);
		}
		if (!/\.(ts|tsx)$/.test(entry.name)) {
			return [];
		}
		return [ path ];
	});
}

export function listFiles(root: string): string[] {
	return readdirSync(
		root,
		{ withFileTypes: true },
	).flatMap((entry) => {
		const path = join(
			root,
			entry.name,
		);
		if (entry.isDirectory()) {
			return listFiles(path);
		}
		return [ path ];
	});
}

export function toProjectPath(path: string): string {
	// Architecture rules use POSIX separators as a platform-neutral project-path contract.
	return relative(
		projectRoot,
		path,
	).replaceAll(
		"\\",
		"/",
	);
}

export function readSource(path: string): string {
	return readFileSync(
		path,
		"utf8",
	);
}

export function readTsConfigAliases(source: string): Record<string, string[]> {
	return (JSON.parse(source) as TsConfigWithAliases).compilerOptions.paths;
}
