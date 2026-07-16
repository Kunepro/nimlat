import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir:   "./tools/e2e",
	testMatch: "**/*.e2e.spec.ts",
	// Electron E2E shares one seeded SQLite/userData sandbox across the serial checks.
	fullyParallel: false,
	workers:       1,
	timeout:       60_000,
	expect:        {
		timeout: 6_000,
	},
	reporter:      "list",
	outputDir:     "test-results/playwright-e2e",
	use:           {
		trace: "retain-on-failure",
	},
});
