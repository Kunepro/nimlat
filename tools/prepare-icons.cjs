const fs   = require("node:fs");
const path = require("node:path");

const ROOT        = path.resolve(
	__dirname,
	"..",
);
const SOURCE_ICON = path.join(
	ROOT,
	"nimlat.png",
);
const DIST_ICON   = path.join(
	ROOT,
	"dist",
	"icon.png",
);
const BUILDER_ICON = path.join(
	ROOT,
	"build",
	"icon.png",
);
const PNG_SIGNATURE = Buffer.from([
	0x89,
	0x50,
	0x4e,
	0x47,
	0x0d,
	0x0a,
	0x1a,
	0x0a,
]);

function assertSourceIcon() {
	const source = fs.readFileSync(SOURCE_ICON);
	if (
		source.length < 24 ||
		!source.subarray(
			0,
			PNG_SIGNATURE.length,
		).equals(PNG_SIGNATURE)
	) {
		throw new Error("nimlat.png must be a valid PNG file.");
	}

	// A square 1024 px master keeps Builder's Windows, macOS, and Linux outputs sharp.
	const width  = source.readUInt32BE(16);
	const height = source.readUInt32BE(20);
	if (width !== 1024 || height !== 1024) {
		throw new Error(`nimlat.png must be 1024x1024, received ${ width }x${ height }.`);
	}
}

function copyIcon(targetPath) {
	fs.mkdirSync(
		path.dirname(targetPath),
		{ recursive: true },
	);
	fs.copyFileSync(
		SOURCE_ICON,
		targetPath,
	);
}

// Keep the branded PNG as the only checked-in source. Electron Builder converts
// its build copy to each platform format, while Electron uses the dist copy at runtime.
assertSourceIcon();
[
	DIST_ICON,
	BUILDER_ICON,
].forEach(copyIcon);

console.log("Prepared dist/icon.png and build/icon.png");
