const fs   = require("fs");
const path = require("path");

const ROOT           = path.resolve(
	__dirname,
	"..",
);
const TARGETS        = [
	"dist",
	"release",
];
const MAX_ATTEMPTS   = 8;
const RETRY_DELAY_MS = 350;

const wait = ms => new Promise(resolve => setTimeout(
	resolve,
	ms,
));

const isRetryable = error =>
	error &&
	(
		error.code === "EPERM" ||
		error.code === "EBUSY" ||
		error.code === "ENOTEMPTY"
	);

async function removeWithRetry(targetPath) {
	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		try {
			fs.rmSync(
				targetPath,
				{
					recursive:  true,
					force:      true,
					maxRetries: 5,
					retryDelay: 100,
				},
			);
			return;
		} catch (error) {
			if (!isRetryable(error) || attempt === MAX_ATTEMPTS) {
				throw error;
			}
			await wait(RETRY_DELAY_MS);
		}
	}
}

async function main() {
	for (const target of TARGETS) {
		const targetPath = path.resolve(
			ROOT,
			target,
		);
		await removeWithRetry(targetPath);
	}
}

main().catch(error => {
	console.error("Failed to clean build output.");
	console.error(error?.stack || error);
	process.exit(1);
});
