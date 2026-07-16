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
	"getIsAdminModeEnabled",
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
				const { getIsAdminModeEnabled } = await import("./admin-mode");
				expect(getIsAdminModeEnabled()).toBe(true);
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
				const { getIsAdminModeEnabled } = await import("./admin-mode");
				expect(getIsAdminModeEnabled()).toBe(false);
			},
		);
	},
);
