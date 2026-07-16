// @vitest-environment node

import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import { resolveGroupCompletionPercent } from "./group-completion-header-model";

function createSummary(overrides: Partial<GroupInspectionSummary> = {}): GroupInspectionSummary {
	return {
		groupId:            1,
		name:               "Planetes",
		mediasCount:        3,
		watchedMediasCount: 0,
		...overrides,
	};
}

describe(
	"group-completion-header-model",
	() => {
		it(
			"uses explicit group integration percent when available",
			() => {
				expect(resolveGroupCompletionPercent(createSummary({ integrationPercent: 42.4 }))).toBe(42);
				expect(resolveGroupCompletionPercent(createSummary({ integrationPercent: -10 }))).toBe(0);
				expect(resolveGroupCompletionPercent(createSummary({ integrationPercent: 120 }))).toBe(100);
			},
		);

		it(
			"keeps summary rows without aggregate completion hidden unless the group is empty",
			() => {
				expect(resolveGroupCompletionPercent(createSummary())).toBeNull();
				expect(resolveGroupCompletionPercent(createSummary({ mediasCount: 0 }))).toBe(0);
			},
		);
	},
);
