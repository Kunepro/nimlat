import {
	describe,
	expect,
	it,
} from "vitest";
import { isRestorableRoute } from "./app-shell-model";

describe(
	"app-shell-model",
	() => {
		it(
			"limits persisted startup routes to app sections that are safe to restore",
			() => {
				expect(isRestorableRoute("/groups")).toBe(true);
				expect(isRestorableRoute("/groups/user/3")).toBe(true);
				expect(isRestorableRoute("/populate-anime-db")).toBe(true);
				expect(isRestorableRoute("/release-watch")).toBe(true);
				expect(isRestorableRoute("/errored-content")).toBe(true);
				expect(isRestorableRoute("/")).toBe(false);
				expect(isRestorableRoute("/download-precached-anime-db")).toBe(false);
				expect(isRestorableRoute("/unknown")).toBe(false);
			},
		);
	},
);
