// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { formatConsoleLog } from "./format-console-log";

describe(
	"formatConsoleLog",
	() => {
		it(
			"renders timestamp lines as readable local time without changing other numeric fields",
			() => {
				const formatted = formatConsoleLog([
					"[main-service-error]",
					"timestamp: 1778349827344",
					"detail.mediaId: 64",
					"message: fetch failed",
				].join("\n"));

				expect(formatted).toContain("timestamp: 2026-05-09");
				expect(formatted).toContain("detail.mediaId: 64");
				expect(formatted).not.toContain("timestamp: 1778349827344");
			},
		);
	},
);
