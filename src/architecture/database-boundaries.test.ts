// @vitest-environment node

import { join } from "node:path";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	findCatchBlocksWithoutThrow,
	findDatabaseFacadeCallableViolations,
	findDatabaseFacadeRuntimeHelperViolations,
	findDefaultParameterViolations,
	findRuntimeConditionalExpressionViolations,
	findViolations,
	listSourceFiles,
	readSource,
	sourceRoot,
	stripCommentsAndStrings,
	toProjectPath,
} from "./architecture-boundary-test-utils";

describe(
	"database architecture boundaries",
	() => {
		const allSourceFiles = listSourceFiles(sourceRoot);

		it(
			"keeps database facades as delegation-only panels",
			() => {
				const operationsRoot = join(
					sourceRoot,
					"database",
					"operations",
				);
				const facadeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(operationsRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations     = findViolations(
					facadeFiles,
					(source) => {
						const executableSource = stripCommentsAndStrings(source);
						// DB facades may wrap calls for logging/rethrow, but branching belongs
						// in operation/service files where domain ownership is explicit.
						if (/\b(if|else|switch|for|while)\b/.test(executableSource)) {
							return "contains branching or loop logic";
						}
						if (/from\s+["']better-sqlite3["']|require\(\s*["']better-sqlite3["']\s*\)/.test(source)) {
							return "imports the SQLite driver directly";
						}
						if (/\b(?:prepare|transaction)\s*\(/.test(executableSource)) {
							return "executes DB driver operations directly";
						}
						if (/\b(?:CREATE|ALTER|DROP|SELECT|INSERT|UPDATE|DELETE)\b/.test(executableSource)) {
							return "contains SQL instead of delegating to an operation";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps database facade panels small enough to remain navigable",
			() => {
				const maxFacadeLines = 200;
				const operationsRoot = join(
					sourceRoot,
					"database",
					"operations",
				);
				const facadeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(operationsRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations     = facadeFiles.flatMap((file) => {
					const lineCount = readSource(file).split("\n").length;
					return lineCount > maxFacadeLines
						? [ `${ toProjectPath(file) }: has ${ lineCount } lines; split the facade by domain process` ]
						: [];
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps database facade call paths free of inline decision expressions",
			() => {
				const operationsRoot = join(
					sourceRoot,
					"database",
					"operations",
				);
				const facadeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(operationsRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations     = facadeFiles.flatMap((file) => {
					return findRuntimeConditionalExpressionViolations(
						readSource(file),
						file,
					);
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps database facade files free of local runtime helpers",
			() => {
				const operationsRoot = join(
					sourceRoot,
					"database",
					"operations",
				);
				const facadeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(operationsRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations     = facadeFiles.flatMap((file) => {
					return findDatabaseFacadeRuntimeHelperViolations(
						readSource(file),
						file,
					);
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps database facade callables as single logged operation delegates",
			() => {
				const operationsRoot = join(
					sourceRoot,
					"database",
					"operations",
				);
				const facadeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(operationsRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations     = facadeFiles.flatMap((file) => {
					return findDatabaseFacadeCallableViolations(
						readSource(file),
						file,
					);
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps database facade signatures free of domain defaults",
			() => {
				const operationsRoot = join(
					sourceRoot,
					"database",
					"operations",
				);
				const facadeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(operationsRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations     = facadeFiles.flatMap((file) => {
					return findDefaultParameterViolations(
						readSource(file),
						file,
					);
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps deep database implementation imports inside src/database",
			() => {
				const databaseRoot     = join(
					sourceRoot,
					"database",
				);
				const nonDatabaseFiles = allSourceFiles.filter((file) => !file.startsWith(databaseRoot));
				const violations       = findViolations(
					nonDatabaseFiles,
					(source) => /from\s+["'][^"']*(?:src\/database\/operations|database\/operations|\.\.\/.*database\/operations)/.test(source)
						? "imports database operation internals"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps SQLite driver and DB-bus reads inside src/database",
			() => {
				const databaseRoot     = join(
					sourceRoot,
					"database",
				);
				const nonDatabaseFiles = allSourceFiles.filter((file) =>
					!file.startsWith(databaseRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations       = findViolations(
					nonDatabaseFiles,
					(source) => {
						if (/from\s+["']better-sqlite3["']|require\(\s*["']better-sqlite3["']\s*\)/.test(source)) {
							return "imports the SQLite driver outside the database layer";
						}
						if (/\bBUS_Database\s*\.\s*getValue\s*\(/.test(source)) {
							return "reads the database bus outside the database layer";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps database facades from swallowing DB errors",
			() => {
				const operationsRoot = join(
					sourceRoot,
					"database",
					"operations",
				);
				const facadeFiles    = allSourceFiles.filter((file) =>
					file.startsWith(operationsRoot)
					&& file.endsWith(".facade.ts"),
				);
				const violations     = facadeFiles.flatMap((file) => {
					const source           = readSource(file);
					const executableSource = stripCommentsAndStrings(source);
					const fileViolations   = [];
					if (/LoggerUtils\.logHydrationQueueError/.test(executableSource)) {
						fileViolations.push(`${ toProjectPath(file) }: uses queue logger inside a DB facade`);
					}
					findCatchBlocksWithoutThrow(executableSource).forEach((line) => {
						fileViolations.push(`${ toProjectPath(file) }: catch block near line ${ line } does not rethrow`);
					});
					return fileViolations;
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps group read models bounded to summaries and ranges",
			() => {
				const violations = allSourceFiles.flatMap((file) => {
					const source                   = stripCommentsAndStrings(readSource(file));
					const projectPath              = toProjectPath(file);
					const fileViolations: string[] = [];

					if (/\bGroupInspectionData\b/.test(source)) {
						fileViolations.push(`${ projectPath }: uses the removed full group inspection payload`);
					}
					if (/\bcreateGroupInspectionData\b/.test(source)) {
						fileViolations.push(`${ projectPath }: recreates the removed full group inspection mapper`);
					}
					if (/\bselect(?:User)?GroupInspectionById\b/.test(source)) {
						fileViolations.push(`${ projectPath }: imports a full group inspection selector`);
					}
					if (/\b(?:AnimeDbFacade\.group|UserDbFacade\.grouping)\.getInspection\s*\(/.test(source)) {
						fileViolations.push(`${ projectPath }: reads an unbounded group inspection`);
					}

					return fileViolations;
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps edit and image-gallery services off the full media inspection read model",
			() => {
				const guardedRoots = [
					join(
						sourceRoot,
						"main",
						"services",
						"episode",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"image-cache",
					),
					join(
						sourceRoot,
						"main",
						"services",
						"media",
					),
				];
				const guardedFiles = allSourceFiles.filter((file) =>
					guardedRoots.some((root) => file.startsWith(root))
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bAnimeDbFacade\.media\.getInspection\s*\(/.test(stripCommentsAndStrings(source))
						? "loads full media inspection where a bounded snapshot/read model is required"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);
	},
);
