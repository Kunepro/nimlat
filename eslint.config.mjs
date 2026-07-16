import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default [
	{
		ignores: [
			"dist",
			"node_modules",
		],
	},

	// ✅ Base setup for TS/React
	{
		files:           [ "src/**/*.{ts,tsx,js,jsx}" ],
		languageOptions: {
			parser:        tsParser,
			parserOptions: {
				project:         "./tsconfig.json",
				tsconfigRootDir: process.cwd(),
				sourceType:      "module",
			},
			ecmaVersion:   "latest",
		},
		settings:        { react: { version: "18.3" } },
		plugins:         {
			react,
			"react-hooks":        reactHooks,
			"react-refresh":      reactRefresh,
			"@typescript-eslint": tsPlugin,
		},
		rules:           {
			...js.configs.recommended.rules,
			...react.configs.recommended.rules,
			...react.configs[ "jsx-runtime" ].rules,
			...reactHooks.configs.recommended.rules,
			...tsPlugin.configs.recommended.rules,
			"no-unused-vars":                       "off",
			"@typescript-eslint/no-unused-vars":    [
				"error",
				{ caughtErrors: "none" },
			],
			"react/jsx-no-target-blank":            "off",
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
		},
	},

	// ✅ Main environment type recognition
	{
		files:           [
			"src/main/**/*.ts",
			"src/database/**/*.ts",
			"src/busses/main/**/*.ts",
			"src/constants/main/**/*.ts",
			"src/loggers/main/**/*.ts",
		],
		languageOptions: {
			globals: {
				...globals.node,
				NodeJS: "readonly",
			},
		},
	},

	// ✅ Renderer environment type recognition
	{
		files:           [
			"src/renderer/**/*.{ts,tsx}",
			"src/preload/**/*.ts",
			"src/busses/renderer/**/*.ts",
			"src/constants/renderer/**/*.ts",
			"src/loggers/renderer/**/*.ts",
		],
		languageOptions: {
			globals: globals.browser,
		},
	},

	// ✅ Shared files environment
	{
		files:           [ "src/shared/**/*.{ts,tsx}" ],
		languageOptions: {
			globals: {
				...globals.es2020,
				console: "readonly",
			},
		},
	},


	// ✅ Shared rules
	{
		files: [ "src/shared/**/*.{ts,tsx}" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Shared cannot import main code.",
						},
						{
							group:   [ "**/renderer/**" ],
							message: "Shared cannot import renderer code.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Shared cannot import preload code.",
						},
						{
							group:   [ "**/busses/**" ],
							message: "Shared cannot import busses code. Use IPC.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Shared cannot import main code.",
						},
					],
				},
			],
		},
	},

	// ✅ Constants main rules
	{
		files: [ "src/constants/main/**/*.ts" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Constants main cannot import main code.",
						},
						{
							group:   [ "**/renderer/**" ],
							message: "Constants main cannot import renderer code.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Constants main cannot import preload code.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Constants main cannot import database.",
						},
					],
				},
			],
		},
	},

	// ✅ Constants renderer rules
	{
		files: [ "src/constants/renderer/**/*.ts" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Database cannot import main code.",
						},
						{
							group:   [ "**/renderer/**" ],
							message: "Database cannot import renderer code.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Database cannot import preload code.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Constants main cannot import database.",
						},
					],
				},
			],
		},
	},

	// ✅ Busses main rules
	{
		files: [ "src/busses/main/**/*.ts" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/../**/main/**" ],
							message: "Busses cannot import main app files.",
						},
						{
							group:   [ "**/renderer/**" ],
							message: "Busses cannot import renderer files.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Busses cannot import preload files.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Busses cannot import database.",
						},
						{
							group:   [ "**/loggers/**" ],
							message: "Busses cannot import loggers.",
						},
					],
				},
			],
		},
	},

	// ✅ Busses renderer rules
	{
		files: [ "src/busses/renderer/**/*.ts" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Busses cannot import main files.",
						},
						{
							group:   [ "**/../**/renderer/**" ],
							message: "Busses cannot import renderer app files.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Busses cannot import preload files.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Busses cannot import database.",
						},
						{
							group:   [ "**/loggers/**" ],
							message: "Busses cannot import loggers.",
						},
					],
				},
			],
		},
	},

	// ✅ Loggers main rules
	{
		files: [ "src/loggers/main/**/*.ts" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/../**/main/**" ],
							message: "Main loggers cannot import main application files.",
						},
						{
							group:   [ "**/renderer/**" ],
							message: "Main loggers cannot import renderer code.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Main loggers cannot import preload.",
						},
						{
							group:   [
								"**/../**/database/**",
								"@nimlat/database",
							],
							message: "Main loggers cannot import database.",
						},
					],
				},
			],
		},
	},

	// ✅ Loggers renderer rules
	{
		files: [ "src/loggers/renderer/**/*.ts" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Renderer loggers cannot import main code.",
						},
						{
							group:   [ "**/../**/renderer/**" ],
							message: "Renderer loggers cannot import renderer app files.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Renderer loggers cannot import preload.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Renderer loggers cannot import database.",
						},
					],
				},
			],
		},
	},

	// ✅ Database rules
	{
		files: [ "src/database/**/*.ts" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/renderer/**" ],
							message: "Database cannot import renderer code.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Database cannot import preload code.",
						},
						{
							group:   [ "**/../**/main/**" ],
							message: "Database cannot import main app files.",
						},
					],
				},
			],
		},
	},

	// ✅ Main rules
	{
		files: [ "src/main/**/*.{ts,tsx}" ],
		rules: {
			"no-restricted-syntax":  [
				"error",
				{
					selector: "CallExpression[callee.object.object.name='AnimeDbFacade'][callee.object.property.name='ip'][callee.property.name='create']",
					message:  "Use IpMutationService.createIp so reactive BUS side effects are always triggered.",
				},
				{
					selector: "CallExpression[callee.object.object.name='AnimeDbFacade'][callee.object.property.name='ip'][callee.property.name='assignSeriesToIp']",
					message:  "Use IpMutationService.assignSeriesToIp so reactive BUS side effects are always triggered.",
				},
				{
					selector: "CallExpression[callee.object.object.name='AnimeDbFacade'][callee.object.property.name='ip'][callee.property.name='removeSerieFromIp']",
					message:  "Use IpMutationService.removeSerieFromIp so reactive BUS side effects are always triggered.",
				},
				{
					selector: "CallExpression[callee.object.object.name='AnimeDbFacade'][callee.object.property.name='ip'][callee.property.name='updateIpDetails']",
					message:  "Use an IpMutationService wrapper for updateIpDetails so reactive BUS side effects are always triggered.",
				},
				{
					selector: "CallExpression[callee.object.object.name='AnimeDbFacade'][callee.object.property.name='ip'][callee.property.name='deleteIP']",
					message:  "Use an IpMutationService wrapper for deleteIP so reactive BUS side effects are always triggered.",
				},
				{
					selector: "ImportDeclaration[source.value='@nimlat/components']",
					message:  "Main cannot import renderer components. Use IPC or shared non-renderer types.",
				},
			],
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/renderer/**" ],
							message: "Main cannot import renderer. Use IPC.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Main cannot import preload. Use IPC.",
						},
						{
							group:   [ "**/../**/database/" ],
							message: "Use the path alias (e.g. @nimlat/database) to access database.",
						},
						{
							group:   [ "@nimlat/database/**" ],
							message: "You can only import from the exports of the database module.",
						},
					],
				},
			],
		},
	},

	// ✅ Explicit exception: this service is the required central write gateway for IP mutations.
	{
		files: [ "src/main/services/ip/ip-mutation-service.ts" ],
		rules: {
			"no-restricted-syntax": "off",
		},
	},

	// ✅ Renderer rules
	{
		files: [ "src/renderer/**/*.{ts,tsx}" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Renderer cannot import main. Use IPC.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Renderer cannot import preload directly.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Renderer cannot import database. Use IPC.",
						},
					],
				},
			],
		},
	},

	// ✅ Preload rules
	{
		files: [ "src/renderer/components/**/*.{ts,tsx}" ],
		rules: {
			"no-restricted-syntax":  [
				"error",
				{
					selector: "ImportDeclaration[source.value='@nimlat/components']",
					message:  "Components cannot import the components barrel; use local relative imports to avoid circular dependencies.",
				},
			],
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Renderer cannot import main. Use IPC.",
						},
						{
							group:   [ "**/preload/**" ],
							message: "Renderer cannot import preload directly.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Renderer cannot import database. Use IPC.",
						},
					],
				},
			],
		},
	},

	{
		files: [
			"src/shared/**/*.{ts,tsx}",
			"src/constants/**/*.{ts,tsx}",
			"src/busses/**/*.{ts,tsx}",
			"src/loggers/**/*.{ts,tsx}",
			"src/database/**/*.{ts,tsx}",
			"src/preload/**/*.{ts,tsx}",
		],
		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector: "ImportDeclaration[source.value='@nimlat/components']",
					message:  "Only renderer app code can import renderer components.",
				},
			],
		},
	},

	{
		files: [ "src/preload/**/*.{ts,tsx}" ],
		rules: {
			"no-restricted-imports": [
				"error",
				{
					patterns: [
						{
							group:   [ "**/main/**" ],
							message: "Preload cannot import main files.",
						},
						{
							group:   [ "**/renderer/**" ],
							message: "Preload cannot import renderer files.",
						},
						{
							group:   [ "**/database/**" ],
							message: "Preload cannot import database. Use IPC.",
						},
					],
				},
			],
		},
	},
];
