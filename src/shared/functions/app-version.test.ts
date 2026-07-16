import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createAppVersionInfo,
	formatAppDisplayVersion,
	getAppReleaseNumber,
} from "./app-version";

describe(
	"app version helpers",
	() => {
		it(
			"formats semver-compatible release numbers as integer product versions",
			() => {
				expect(getAppReleaseNumber("0.0.0")).toBe(0);
				expect(formatAppDisplayVersion("1.0.0")).toBe("Version 1");
				expect(createAppVersionInfo("12.0.0")).toEqual({
					technicalVersion: "12.0.0",
					releaseNumber:    12,
					displayVersion:   "Version 12",
				});
			},
		);

		it(
			"falls back to Version 0 for malformed technical versions",
			() => {
				expect(formatAppDisplayVersion("preview")).toBe("Version 0");
				expect(formatAppDisplayVersion("")).toBe("Version 0");
			},
		);
	},
);
