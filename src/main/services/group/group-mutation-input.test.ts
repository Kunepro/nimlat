// @vitest-environment node
import {
	describe,
	expect,
	it,
	vi,
} from "vitest";

const getGroupBlueprintForMediaSelection = vi.fn();

vi.mock(
	"../../utils/compute-group-for-new-media/get-group-blueprint",
	() => ({
		getGroupBlueprintForMediaSelection,
	}),
);

describe(
	"group-mutation-input",
	() => {
		it(
			"trims names and dedupes media ids without sorting caller intent",
			async () => {
				const { prepareNamedMediaSelection } = await import("./group-mutation-input");

				expect(prepareNamedMediaSelection(
					"  My Group  ",
					[
						22,
						21,
						22,
					],
				)).toEqual({
					name:     "My Group",
					mediaIds: [
						22,
						21,
					],
				});
			},
		);

		it(
			"rejects empty names and empty media selections before DB writes",
			async () => {
				const { prepareNamedMediaSelection } = await import("./group-mutation-input");

				expect(() => prepareNamedMediaSelection(
					"  ",
					[ 1 ],
				)).toThrow("Group name is required.");
				expect(() => prepareNamedMediaSelection(
					"Valid",
					[],
				)).toThrow("Select at least one media or group first.");
			},
		);

		it(
			"builds official and user blueprints from the same prepared selection",
			async () => {
				getGroupBlueprintForMediaSelection.mockReturnValue({
					baseMediaId: 21,
					name:        "Derived Name",
					description: "Derived description",
					imageUrl:    "derived.jpg",
				});

				const {
								createOfficialGroupBlueprintFromSelection,
								createUserGroupBlueprintFromSelection,
							}         = await import("./group-mutation-input");
				const selection = {
					name:     "My Group",
					mediaIds: [
						22,
						21,
					],
				};

				expect(createOfficialGroupBlueprintFromSelection(selection)).toEqual({
					baseMediaId: 21,
					name:        "Derived Name",
					description: "Derived description",
					imageUrl:    "derived.jpg",
				});
				expect(createUserGroupBlueprintFromSelection(
					selection,
					12345,
				)).toEqual({
					baseMediaId:   21,
					name:          "Derived Name",
					description:   "Derived description",
					imageUrl:      "derived.jpg",
					isUserCreated: 1,
					createdAt:     12345,
					updatedAt:     12345,
				});
				expect(getGroupBlueprintForMediaSelection).toHaveBeenCalledWith(
					[
						22,
						21,
					],
					{ name: "My Group" },
				);
			},
		);
	},
);
