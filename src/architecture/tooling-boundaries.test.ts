// @vitest-environment node

import { existsSync } from "node:fs";
import { join } from "node:path";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	findViteAliasTargets,
	listFiles,
	projectRoot,
	readSource,
	readTsConfigAliases,
	sourceRoot,
	toProjectPath,
} from "./architecture-boundary-test-utils";

describe(
	"tooling architecture boundaries",
	() => {
		it(
			"keeps TypeScript aliases pointed at existing source entries",
			() => {
				const tsConfigPath    = join(
					projectRoot,
					"tsconfig.json",
				);
				const tsConfigAliases = readTsConfigAliases(readSource(tsConfigPath));
				const violations      = Object.entries(tsConfigAliases).flatMap(([ alias, targets ]) =>
					targets.flatMap((target) => {
						const targetWithoutWildcard = target.replace(
							/\/\*$/,
							"",
						);
						const targetPath            = join(
							projectRoot,
							targetWithoutWildcard,
						);
						return existsSync(targetPath)
							? []
							: [ `tsconfig.json: ${ alias } points at missing ${ target }` ];
					}),
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps Vite aliases pointed at existing source entries",
			() => {
				const viteConfigPath = join(
					projectRoot,
					"vite.config.js",
				);
				const violations     = findViteAliasTargets(readSource(viteConfigPath)).flatMap((alias) => {
					const targetPath = join(
						projectRoot,
						alias.target,
					);
					return existsSync(targetPath)
						? []
						: [ `vite.config.js: ${ alias.alias } near line ${ alias.line } points at missing ${ alias.target }` ];
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps architecture boundary specs small enough to review by domain",
			() => {
				const maxBoundarySpecLines = 500;
				const architectureRoot     = join(
					sourceRoot,
					"architecture",
				);
				const boundarySpecFiles    = listFiles(architectureRoot)
					.filter((file) => file.endsWith("-boundaries.test.ts"));
				const violations           = boundarySpecFiles.flatMap((file) => {
					const lineCount = readSource(file).split("\n").length;
					return lineCount > maxBoundarySpecLines
						? [ `${ toProjectPath(file) }: has ${ lineCount } lines; split the boundary spec by domain` ]
						: [];
				});

				expect(violations).toEqual([]);
			},
		);
	},
);
