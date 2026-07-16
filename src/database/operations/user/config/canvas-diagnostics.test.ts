// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";

const getMock = vi.fn();
const runMock = vi.fn();

vi.mock(
	"../../../utils/get-db",
	() => ({
		getDatabase: () => ({
			prepare: () => ({
				get: getMock,
				run: runMock,
			}),
		}),
	}),
);

describe(
	"canvas-diagnostics config",
	() => {
		it.each([
			"true",
			"1",
			"yes",
			"on",
			1,
			true,
		])(
			"treats %s as enabled",
			async (settingValue) => {
				const { getIsCanvasDiagnosticsEnabled } = await import("./canvas-diagnostics");

				getMock.mockReturnValue({ settingValue });

				expect(getIsCanvasDiagnosticsEnabled()).toBe(true);
			},
		);

		it.each([
			undefined,
			null,
			"false",
			"0",
			"off",
			0,
			false,
		])(
			"treats %s as disabled",
			async (settingValue) => {
				const { getIsCanvasDiagnosticsEnabled } = await import("./canvas-diagnostics");

				getMock.mockReturnValue(settingValue === undefined ? undefined : { settingValue });

				expect(getIsCanvasDiagnosticsEnabled()).toBe(false);
			},
		);

		it(
			"persists the diagnostics flag",
			async () => {
				const { setIsCanvasDiagnosticsEnabled } = await import("./canvas-diagnostics");

				setIsCanvasDiagnosticsEnabled(true);
				setIsCanvasDiagnosticsEnabled(false);

				expect(runMock).toHaveBeenNthCalledWith(
					1,
					"canvasDiagnosticsEnabled",
					"true",
				);
				expect(runMock).toHaveBeenNthCalledWith(
					2,
					"canvasDiagnosticsEnabled",
					"false",
				);
			},
		);
	},
);
