import {
	describe,
	expect,
	it,
} from "vitest";
import { buildPreferenceMenuItems } from "./preferences-modal-model";

describe(
	"preferences-modal-model",
	() => {
		it(
			"hides the developer section when dev mode is disabled",
			() => {
				expect(buildPreferenceMenuItems(false)).toEqual([
					{
						type:  "item",
						key:   "general",
						label: "General",
					},
					{
						type:  "item",
						key:   "tracking",
						label: "Watched",
					},
					{
						type:  "item",
						key:   "download",
						label: "Download",
					},
					{
						type:  "item",
						key:   "app",
						label: "About",
					},
				]);
			},
		);

		it(
			"shows the developer section only when dev mode is enabled",
			() => {
				expect(buildPreferenceMenuItems(true).map(item => item.key)).toEqual([
					"general",
					"tracking",
					"download",
					"app",
					"developers",
				]);
			},
		);
	},
);
