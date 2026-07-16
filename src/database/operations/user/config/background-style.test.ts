// @vitest-environment node
import type { BackgroundStyle } from "@nimlat/types/user-config";
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
	"background-style config",
	() => {
		it(
			"defaults to kana matrix for missing or unsupported values",
			async () => {
				const { getBackgroundStyle } = await import("./background-style");

				getMock.mockReturnValue(undefined);
				expect(getBackgroundStyle()).toBe("kanaMatrix");

				getMock.mockReturnValue({ settingValue: "unknown" });
				expect(getBackgroundStyle()).toBe("kanaMatrix");
			},
		);

		it.each<BackgroundStyle>([
			"synthwave",
			"kanaMatrix",
			"kanaGrid",
			"staticDarkBlue",
		])(
			"persists %s as a supported background style",
			async (style) => {
				const { setBackgroundStyle } = await import("./background-style");

				setBackgroundStyle(style);

				expect(runMock).toHaveBeenCalledWith(
					"backgroundStyle",
					style,
				);
			},
		);
	},
);
