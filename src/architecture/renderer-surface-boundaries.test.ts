// @vitest-environment node

import {
	dirname,
	join,
	normalize,
} from "node:path";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	findElectronBoundaryViolation,
	findViolations,
	listFiles,
	listSourceFiles,
	readSource,
	readStaticModuleSpecifiers,
	sourceRoot,
	stripCommentsAndStrings,
	toProjectPath,
} from "./architecture-boundary-test-utils";

describe(
	"renderer surface architecture boundaries",
	() => {
		const allSourceFiles = listSourceFiles(sourceRoot);

		it(
			"keeps renderer code behind preload instead of importing main, Electron, or database modules",
			() => {
				const rendererRoot  = join(
					sourceRoot,
					"renderer",
				);
				const rendererFiles = allSourceFiles.filter((file) => file.startsWith(rendererRoot));
				const violations    = findViolations(
					rendererFiles,
					(source) => {
						const electronBoundaryViolation = findElectronBoundaryViolation(source);
						if (electronBoundaryViolation) {
							return electronBoundaryViolation;
						}
						if (/@nimlat\/database/.test(source)) {
							return "imports the database facade from renderer";
						}
						if (/from\s+["'][^"']*(?:src\/main|src\/database)/.test(source)) {
							return "deep-imports main/database code from renderer";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps preload APIs as bridge-only modules",
			() => {
				const preloadRoot  = join(
					sourceRoot,
					"preload",
				);
				const preloadFiles = allSourceFiles.filter((file) =>
					file.startsWith(preloadRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					preloadFiles,
					(source) => {
						if (/@nimlat\/(?:database|busses|loggers|components)|@nimlat\/constants\/main/.test(source)) {
							return "imports app implementation namespaces instead of shared bridge contracts";
						}
						if (/from\s+["'][^"']*(?:src\/main|src\/database|src\/renderer|\.\.\/main|\.\.\/database|\.\.\/renderer)/.test(source)) {
							return "deep-imports implementation code into preload";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps preload bridge modules small enough to audit by channel group",
			() => {
				const maxPreloadBridgeLines = 180;
				const preloadRoot           = join(
					sourceRoot,
					"preload",
				);
				const preloadFiles          = allSourceFiles.filter((file) =>
					file.startsWith(preloadRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations            = preloadFiles.flatMap((file) => {
					const lineCount = readSource(file).split("\n").length;
					return lineCount > maxPreloadBridgeLines
						? [ `${ toProjectPath(file) }: has ${ lineCount } lines; split the preload bridge by channel group` ]
						: [];
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps direct renderer Electron API calls inside facades and services",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const facadesRoot  = join(
					rendererRoot,
					"facades",
				);
				const servicesRoot = join(
					rendererRoot,
					"services",
				);
				const guardedFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !file.startsWith(facadesRoot)
					&& !file.startsWith(servicesRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = findViolations(
					guardedFiles,
					(source) => /\bwindow\s*\.\s*electronAPI\b/.test(stripCommentsAndStrings(source))
						? "calls preload directly instead of going through a renderer facade/service boundary"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"routes renderer external navigation through the preload-owned shell boundary",
			() => {
				const rendererRoot  = join(
					sourceRoot,
					"renderer",
				);
				const rendererFiles = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations    = findViolations(
					rendererFiles,
					(source) => {
						if (/\bwindow\s*\.\s*open\s*\(/.test(stripCommentsAndStrings(source))) {
							return "opens external windows directly instead of using ExternalNavigationFacade";
						}
						if (/\btarget\s*=\s*["']_blank["']/.test(source)) {
							return "uses target=\"_blank\" instead of the ExternalNavigationFacade shell boundary";
						}
						return null;
					},
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer feature surfaces behind facades and hooks instead of services",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const servicesRoot = join(
					rendererRoot,
					"services",
				);
				const guardedRoots = [
					"components",
					"features",
					"hooks",
					"media-wall",
					"modals",
					"routes",
				].map((segment) => join(
					rendererRoot,
					segment,
				));
				const guardedFiles = allSourceFiles.filter((file) =>
					guardedRoots.some((root) => file.startsWith(root))
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = guardedFiles.flatMap((file) => {
					return readStaticModuleSpecifiers(
						readSource(file),
						file,
					).flatMap((imported) => {
						if (!imported.moduleSpecifier.startsWith(".")) {
							return imported.moduleSpecifier === "@nimlat/services"
								? [ `${ toProjectPath(file) }: imports renderer service barrel near line ${ imported.line }; consume a facade or hook` ]
								: [];
						}

						const resolvedImport = normalize(join(
							dirname(file),
							imported.moduleSpecifier,
						));
						return resolvedImport === servicesRoot || resolvedImport.startsWith(`${ servicesRoot }/`)
							? [ `${ toProjectPath(file) }: imports renderer service implementation near line ${ imported.line }; consume a facade or hook` ]
							: [];
					});
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer services off the facade barrel to avoid hidden import cycles",
			() => {
				const rendererRoot = join(
					sourceRoot,
					"renderer",
				);
				const servicesRoot = join(
					rendererRoot,
					"services",
				);
				const facadesRoot  = join(
					rendererRoot,
					"facades",
				);
				const serviceFiles = allSourceFiles.filter((file) =>
					file.startsWith(servicesRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations   = serviceFiles.flatMap((file) => {
					return readStaticModuleSpecifiers(
						readSource(file),
						file,
					).flatMap((imported) => {
						if (!imported.moduleSpecifier.startsWith(".")) {
							return imported.moduleSpecifier === "@nimlat/facades"
								? [ `${ toProjectPath(file) }: imports the renderer facade barrel near line ${ imported.line }; import the specific facade module` ]
								: [];
						}

						const resolvedImport = normalize(join(
							dirname(file),
							imported.moduleSpecifier,
						));
						return resolvedImport === facadesRoot || resolvedImport === join(
							facadesRoot,
							"index",
						)
							? [ `${ toProjectPath(file) }: imports the renderer facade barrel near line ${ imported.line }; import the specific facade module` ]
							: [];
					});
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"prevents shared renderer components from importing their own barrel",
			() => {
				const componentsRoot = join(
					sourceRoot,
					"renderer",
					"components",
				);
				const componentFiles = allSourceFiles.filter((file) => file.startsWith(componentsRoot));
				const violations     = findViolations(
					componentFiles,
					(source) => /@nimlat\/components/.test(source)
						? "imports @nimlat/components and can create a barrel cycle"
						: null,
				);

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps shared renderer components behind the @nimlat/components barrel for external consumers",
			() => {
				const rendererRoot   = join(
					sourceRoot,
					"renderer",
				);
				const componentsRoot = join(
					rendererRoot,
					"components",
				);
				const guardedFiles   = allSourceFiles.filter((file) =>
					file.startsWith(rendererRoot)
					&& !file.startsWith(componentsRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations     = guardedFiles.flatMap((file) => {
					return readStaticModuleSpecifiers(
						readSource(file),
						file,
					).flatMap((imported) => {
						if (!imported.moduleSpecifier.startsWith(".")) {
							return [];
						}

						const resolvedImport = normalize(join(
							dirname(file),
							imported.moduleSpecifier,
						));
						return resolvedImport.startsWith(`${ componentsRoot }/`)
							? [ `${ toProjectPath(file) }: imports shared renderer component implementation near line ${ imported.line }; use @nimlat/components` ]
							: [];
					});
				});

				expect(violations).toEqual([]);
			},
		);

		it(
			"keeps renderer component styles in CSS modules or documented global style entrypoints",
			() => {
				const rendererRoot             = join(
					sourceRoot,
					"renderer",
				);
				const rendererFiles            = listFiles(rendererRoot);
				const preprocessorFiles        = rendererFiles
					.filter((file) => /\.(?:scss|less)$/.test(file))
					.map((file) => `${ toProjectPath(file) }: CSS preprocessors are not used in renderer styling`);
				const localCssImportViolations = allSourceFiles
					.filter((file) =>
						file.startsWith(rendererRoot)
						&& !/\.test\.(ts|tsx)$/.test(file),
					)
					.flatMap((file) => {
						return readStaticModuleSpecifiers(
							readSource(file),
							file,
						).flatMap((imported) => {
							if (!imported.moduleSpecifier.startsWith(".") || !imported.moduleSpecifier.endsWith(".css")) {
								return [];
							}

							const isGlobalEntrypoint = file === join(
								rendererRoot,
								"main.tsx",
							) && imported.moduleSpecifier === "./index.css";
							const isCssModule        = imported.moduleSpecifier.endsWith(".module.css");
							return isGlobalEntrypoint || isCssModule
								? []
								: [ `${ toProjectPath(file) }: imports local non-module CSS near line ${ imported.line }` ];
						});
					});

				expect([
					...preprocessorFiles,
					...localCssImportViolations,
				]).toEqual([]);
			},
		);

		it(
			"keeps the renderer router as a route-tree assembly module",
			() => {
				const routerPath            = join(
					sourceRoot,
					"renderer",
					"router.tsx",
				);
				const source                = readSource(routerPath);
				const allowedFeatureImports = new Set([
					"./features/AppLayout",
					"./features/not-found/NotFound404",
				]);
				const importPaths           = Array.from(source.matchAll(/from\s+["']([^"']+)["']/g))
					.map(match => match[ 1 ] ?? "");
				const featureViolations     = importPaths
					.filter(importPath => importPath.startsWith("./features/"))
					.filter(importPath => !allowedFeatureImports.has(importPath))
					.map(importPath => `src/renderer/router.tsx: imports feature route implementation ${ importPath }`);
				const missingRouteModules   = [
					"./routes/groups-routes",
					"./routes/startup-routes",
					"./routes/tool-routes",
				].filter(importPath => !importPaths.includes(importPath))
					.map(importPath => `src/renderer/router.tsx: does not import route module ${ importPath }`);

				expect([
					...featureViolations,
					...missingRouteModules,
				]).toEqual([]);
			},
		);

		it(
			"keeps groups shell header wiring inside hooks and shell adapters",
			() => {
				const rendererFeaturesRoot = join(
					sourceRoot,
					"renderer",
					"features",
				);
				const groupsShellRoot      = join(
					sourceRoot,
					"renderer",
					"features",
					"groups",
					"groups-shell",
				);
				const featureFiles         = allSourceFiles.filter((file) =>
					file.startsWith(rendererFeaturesRoot)
					&& !/\.test\.(ts|tsx)$/.test(file),
				);
				const violations           = findViolations(
					featureFiles,
					(source, file) => {
						if (!/\buseGroupsShellHeader\b/.test(source)) {
							return null;
						}
						const projectFile    = toProjectPath(file);
						const isHookFile     = /\/hooks\//.test(projectFile);
						const isShellAdapter = file.startsWith(groupsShellRoot)
							&& /\/use-[^/]+\.(ts|tsx)$/.test(projectFile);
						return isHookFile || isShellAdapter
							? null
							: "configures the groups shell header directly instead of using a page/domain hook";
					},
				);

				expect(violations).toEqual([]);
			},
		);

	},
);
