import {
	describe,
	expect,
	it,
} from "vitest";
import { resolveGroupShellHeaderTitle } from "./group-shell-header-model";

describe(
	"group shell header model",
	() => {
		it(
			"resolves the shell title from loaded group name, routed state, or group id",
			() => {
				expect(resolveGroupShellHeaderTitle({
					groupId:          "9",
					groupName:        "Loaded group",
					initialGroupName: "Initial group",
				})).toBe("Loaded group");
				expect(resolveGroupShellHeaderTitle({
					groupId:          "9",
					groupName:        undefined,
					initialGroupName: "Initial group",
				})).toBe("Initial group");
				expect(resolveGroupShellHeaderTitle({
					groupId:          "9",
					groupName:        undefined,
					initialGroupName: undefined,
				})).toBe("Group 9");
			},
		);
	},
);
