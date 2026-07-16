import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createLibraryMetadataSelectOptions,
	getLibraryIgnoreConfirmationTitle,
	getLibrarySearchPlaceholder,
	getLibraryShellHeaderTitle,
	getLibraryShellNavigationIcon,
	getNextLibraryAdultFilter,
} from "./library-header-actions-model";

describe(
	"library header actions model",
	() => {
		it(
			"cycles adult filters through the tri-state order",
			() => {
				expect(getNextLibraryAdultFilter("mixed")).toBe("adult");
				expect(getNextLibraryAdultFilter("adult")).toBe("nonAdult");
				expect(getNextLibraryAdultFilter("nonAdult")).toBe("mixed");
			},
		);

		it(
			"builds select options without changing metadata names",
			() => {
				expect(createLibraryMetadataSelectOptions([
					"Action",
					"Sci-Fi",
				])).toEqual([
					{
						label: "Action",
						value: "Action",
					},
					{
						label: "Sci-Fi",
						value: "Sci-Fi",
					},
				]);
			},
		);

		it(
			"formats bulk ignore confirmation titles",
			() => {
				expect(getLibraryIgnoreConfirmationTitle(1)).toBe("Ignore 1 selected item?");
				expect(getLibraryIgnoreConfirmationTitle(3)).toBe("Ignore 3 selected items?");
			},
		);

		it(
			"uses scope-specific search placeholders",
			() => {
				expect(getLibrarySearchPlaceholder(false)).toBe("Search library");
				expect(getLibrarySearchPlaceholder(true)).toBe("Search ignored content");
			},
		);

		it(
			"derives shell header labels and navigation from library scope",
			() => {
				expect(getLibraryShellHeaderTitle(false)).toBe("Library");
				expect(getLibraryShellHeaderTitle(true)).toBe("Ignored");
				expect(getLibraryShellNavigationIcon(false)).toBe("home");
				expect(getLibraryShellNavigationIcon(true)).toBe("back");
			},
		);
	},
);
