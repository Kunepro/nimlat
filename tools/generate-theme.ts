import chokidar from "chokidar";
import fs from "fs";
import path from "path";

type ThemeTokenMap = Record<string, string | number>;

// Theme bridge between Ant Design tokens and stylesheet usage.
//
// Why this exists:
// - `theme-config.ts` is the AntD source of truth (JS tokens).
// - Renderer styles also need these values in CSS.
// - Duplicating token values in multiple places leads to drift.
//
// This script generates `theme.css` with CSS variables from the same token map
// so component theme values and custom styles remain consistent.
const OUTPUT_PATH = path.resolve(
	__dirname,
	"../src/renderer/styles/theme.css",
);
const THEME_PATH  = path.resolve(
	__dirname,
	"../src/renderer/wrappers/theme-config.ts",
);

// Keys that should be suffixed with `px` when numeric.
// Everything else stays unitless.
const PX_PREFIXES = [
	"fontSize",
	"padding",
	"margin",
	"space",
	"borderRadius",
];

const toKebab = (value: string): string =>
	value.replace(
		/[A-Z]/g,
		match => `-${ match.toLowerCase() }`,
	);

const needsPx = (key: string): boolean =>
	PX_PREFIXES.some(prefix => key.startsWith(prefix));

// Emit the token map as `:root` custom properties.
// Numeric values become `px` only for dimension-like token families.
function generate(theme: ThemeTokenMap): void {
	const lines = Object.entries(theme).map(([ key, value ]) => {
		const cssKey = `--${ toKebab(key) }`;

		if (typeof value === "number") {
			return `  ${ cssKey }: ${ needsPx(key) ? `${ value }px` : value };`;
		}

		return `  ${ cssKey }: ${ value };`;
	});

	const css = `/* AUTO-GENERATED FILE - DO NOT EDIT
   Generated from theme-config.ts */
:root {
${ lines.join("\n") }
}
`;

	fs.mkdirSync(
		path.dirname(OUTPUT_PATH),
		{ recursive: true },
	);
	fs.writeFileSync(
		OUTPUT_PATH,
		css,
		"utf8",
	);
	console.log("Theme regenerated");
}

// Initial generation for one-off runs (used by `prebuild`).
let themeConfig = require(THEME_PATH).themeConfig as ThemeTokenMap;
generate(themeConfig);

// Watch mode for local development: rebuild variables after token edits.
if (process.argv.includes("--watch")) {
	let timeout: NodeJS.Timeout;
	chokidar.watch(THEME_PATH).on(
		"change",
		() => {
			clearTimeout(timeout);
			timeout = setTimeout(
				() => {
					console.log("Theme config changed, regenerating...");

					// Clear cache so `require` returns the updated token object.
					delete require.cache[ require.resolve(THEME_PATH) ];

					// Re-import the updated config and regenerate `theme.css`.
					themeConfig = require(THEME_PATH).themeConfig as ThemeTokenMap;
					generate(themeConfig);
				},
				100,
			);
		},
	);
}
