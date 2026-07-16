// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import { formatPreferenceOperationError } from "./preferences-operation-feedback";

describe(
	"preferences-operation-feedback",
	() => {
		it(
			"uses real error messages and falls back for unknown errors",
			() => {
				expect(formatPreferenceOperationError(
					new Error("write failed"),
					"fallback",
				)).toBe("write failed");
				expect(formatPreferenceOperationError(
					"write failed",
					"fallback",
				)).toBe("fallback");
				expect(formatPreferenceOperationError(
					new Error("   "),
					"fallback",
				)).toBe("fallback");
			},
		);
	},
);
