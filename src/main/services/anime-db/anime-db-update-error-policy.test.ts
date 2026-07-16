// @vitest-environment node

import {
	describe,
	expect,
	it,
} from "vitest";
import { normalizeAnimeDbUpdateRuntimeError } from "./anime-db-update-error-policy";

describe(
	"anime-db-update-error-policy",
	() => {
		it(
			"passes Error instances through",
			() => {
				const error = new Error("write failed");

				expect(normalizeAnimeDbUpdateRuntimeError(error)).toBe(error);
			},
		);

		it(
			"normalizes non-Error throws for logging and progress state",
			() => {
				expect(normalizeAnimeDbUpdateRuntimeError("write failed")).toEqual(new Error("write failed"));
			},
		);
	},
);
