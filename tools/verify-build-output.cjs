const fs   = require("node:fs");
const path = require("node:path");

const ROOT      = path.resolve(
	__dirname,
	"..",
);
const DIST_DIR  = path.join(
	ROOT,
	"dist",
);
const BUILD_DIR = path.join(
	ROOT,
	"build",
);

function assertFileExists(filePath) {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Missing expected build output: ${ path.relative(
			ROOT,
			filePath,
		) }`);
	}
}

function readTextFile(filePath) {
	return fs.readFileSync(
		filePath,
		"utf8",
	);
}

function listRendererScriptSources(indexHtml) {
	const matches = indexHtml.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi);
	return Array.from(
		matches,
		(match) => match[ 1 ],
	);
}

function resolveDistReference(source) {
	const cleanSource = source.replace(
		/^\.\//,
		"",
	);

	if (
		cleanSource.startsWith("/") ||
		cleanSource.startsWith("http://") ||
		cleanSource.startsWith("https://")
	) {
		throw new Error(`Renderer build must use relative packaged assets, got: ${ source }`);
	}

	return path.join(
		DIST_DIR,
		cleanSource,
	);
}

function verifyRendererEntrypoints(indexHtmlPath) {
	const indexHtml     = readTextFile(indexHtmlPath);
	const scriptSources = listRendererScriptSources(indexHtml);

	if (scriptSources.length === 0) {
		throw new Error("No renderer script entrypoint found in dist/index.html.");
	}

	for (const source of scriptSources) {
		const scriptPath = resolveDistReference(source);
		assertFileExists(scriptPath);

		const script = readTextFile(scriptPath);
		if (/\brequire\s*\(/.test(script)) {
			throw new Error(
				`Renderer entrypoint contains CommonJS require(), which is unsafe for the packaged browser context: ${ path.relative(
					ROOT,
					scriptPath,
				) }`,
			);
		}
	}
}

function verifyPreloadEntrypoint(preloadPath) {
	const preload = readTextFile(preloadPath);

	// Electron's sandbox owns the process binding. A bundled top-level declaration makes
	// the complete preload fail before it can expose any renderer API.
	if (/\b(?:const|let|var)\s+process\s*=/.test(preload)) {
		throw new Error("Preload entrypoint redeclares Electron's reserved process binding.");
	}
	if (/\bglobalThis\.process\b/.test(preload)) {
		throw new Error("Preload entrypoint reads Electron's lexical process binding through globalThis.");
	}
}

function verifyNoRootRendererChunks() {
	const allowedRootFiles = new Set([
		"icon.png",
		"index.html",
		"main.js",
		"main.js.map",
		"preload.js",
		"preload.js.map",
		"vite.svg",
	]);

	const unexpectedRootAssets = fs.readdirSync(
		DIST_DIR,
		{ withFileTypes: true },
	)
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.filter((name) => !allowedRootFiles.has(name));

	if (unexpectedRootAssets.length > 0) {
		throw new Error(`Unexpected renderer assets in dist root: ${ unexpectedRootAssets.join(", ") }`);
	}
}

function main() {
	const indexHtmlPath = path.join(
		DIST_DIR,
		"index.html",
	);
	const preloadPath   = path.join(
		DIST_DIR,
		"preload.js",
	);

	[
		indexHtmlPath,
		path.join(
			DIST_DIR,
			"main.js",
		),
		preloadPath,
		path.join(
			DIST_DIR,
			"icon.png",
		),
	].forEach(assertFileExists);

	assertFileExists(path.join(
		BUILD_DIR,
		"icon.png",
	));

	verifyRendererEntrypoints(indexHtmlPath);
	verifyPreloadEntrypoint(preloadPath);
	verifyNoRootRendererChunks();

	console.log("Build output verification passed.");
}

try {
	main();
} catch (error) {
	console.error("Build output verification failed.");
	console.error(error?.stack || error);
	process.exit(1);
}
