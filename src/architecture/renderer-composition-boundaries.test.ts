// @vitest-environment node

import { join } from "node:path";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	listSourceFiles,
	readSource,
	sourceRoot,
	stripCommentsAndStrings,
	toProjectPath,
} from "./architecture-boundary-test-utils";

describe(
	"renderer composition architecture boundaries",
	() => {
		const allSourceFiles = listSourceFiles(sourceRoot);

		it(
			"keeps renderer route and modal surfaces lean enough to review",
			() => {
				const maxSurfaceLines = 140;
				const guardedRoots    = [
					join(
						sourceRoot,
						"renderer",
						"features",
					),
					join(
						sourceRoot,
						"renderer",
						"modals",
					),
				];
				const guardedFiles    = allSourceFiles.filter((file) =>
					guardedRoots.some((root) => file.startsWith(root))
					&& file.endsWith(".tsx")
					&& !/\/(?:components|hooks)\//.test(toProjectPath(file))
					&& !/\.test\.tsx$/.test(file),
				);
				const violations      = guardedFiles.flatMap((file) => {
					const lineCount = readSource(file).split("\n").length;
					return lineCount > maxSurfaceLines
						? [ `${ toProjectPath(file) }: has ${ lineCount } lines; move orchestration to hooks or split child components` ]
						: [];
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer route and modal surfaces free of local state/effect orchestration",
			() => {
				const guardedRoots = [
					join(
						sourceRoot,
						"renderer",
						"features",
					),
					join(
						sourceRoot,
						"renderer",
						"modals",
					),
				];
				const guardedFiles = allSourceFiles.filter((file) =>
					guardedRoots.some((root) => file.startsWith(root))
					&& file.endsWith(".tsx")
					&& !/\/(?:components|hooks)\//.test(toProjectPath(file))
					&& !/\.test\.tsx$/.test(file),
				);
				const violations   = guardedFiles.flatMap((file) => {
					const source           = readSource(file);
					const executableSource = stripCommentsAndStrings(source);
					return Array.from(executableSource.matchAll(/\buse(?:Effect|Reducer|State)\s*\(/g)).map((match) => {
						const line = executableSource.slice(
							0,
							match.index,
						).split("\n").length;
						return `${ toProjectPath(file) }: owns state/effect orchestration near line ${ line }; move it to a named hook`;
					});
				});

				expect(violations).toEqual([]);
			},
		);
	},
);
