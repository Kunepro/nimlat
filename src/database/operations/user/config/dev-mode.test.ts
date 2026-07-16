// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";

const getMock = vi.fn();

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: () => ({
			prepare: () => ({
				get: getMock,
			}),
		}),
	}),
);

describe(
	"getIsDevModeEnabled",
	() => {
		it.each([
			"true",
			"TRUE",
			" true ",
			"1",
			1,
			true,
			"yes",
			"on",
		])(
			"treats %p as enabled",
			async (settingValue) => {
				getMock.mockReturnValue({ settingValue });
				const { getIsDevModeEnabled } = await import("./dev-mode");
				expect(getIsDevModeEnabled()).toBe(true);
			},
		);

		it.each([
			"false",
			"0",
			0,
			false,
			null,
			undefined,
			"off",
			"no",
		])(
			"treats %p as disabled",
			async (settingValue) => {
				getMock.mockReturnValue({ settingValue });
				const { getIsDevModeEnabled } = await import("./dev-mode");
				expect(getIsDevModeEnabled()).toBe(false);
			},
		);
	},
);
