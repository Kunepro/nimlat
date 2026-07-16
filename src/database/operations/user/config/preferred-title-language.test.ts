// @vitest-environment node
import type { PreferredTitleLanguage } from "@nimlat/types/user-config";
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
	"preferred-title-language config",
	() => {
		it(
			"defaults to english for missing or unsupported values",
			async () => {
				const { getPreferredTitleLanguage } = await import("./preferred-title-language");

				getMock.mockReturnValue(undefined);
				expect(getPreferredTitleLanguage()).toBe("english");

				getMock.mockReturnValue({ settingValue: "italian" });
				expect(getPreferredTitleLanguage()).toBe("english");
			},
		);

		it.each<PreferredTitleLanguage>([
			"english",
			"romaji",
			"native",
		])(
			"persists %s as a supported title language",
			async (language) => {
				const { setPreferredTitleLanguage } = await import("./preferred-title-language");

				setPreferredTitleLanguage(language);

				expect(runMock).toHaveBeenCalledWith(
					"preferredTitleLanguage",
					language,
				);
			},
		);
	},
);
