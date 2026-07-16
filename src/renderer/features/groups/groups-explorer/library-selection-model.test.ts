import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import {
	describe,
	expect,
	it,
} from "vitest";
import {
	createEmptyLibrarySelectionState,
	createLibrarySelectedKeySet,
	removeLibrarySelectedKeys,
	selectLibrarySelectedItems,
	toggleLibrarySelectedItem,
	updateLibrarySelectedItem,
} from "./library-selection-model";

function createLibraryItem(key: string, name = key): LibraryDisplayItem {
	return {
		key,
		kind:        "media",
		name,
		mediaId:     Number(key.replace(
			/\D/g,
			"",
		)) || 1,
		isWatched:   false,
		lastRefresh: "",
	};
}

describe(
	"library selection model",
	() => {
		it(
			"toggles selected items while preserving selection order",
			() => {
				const first  = createLibraryItem(
					"media:1",
					"First",
				);
				const second = createLibraryItem(
					"media:2",
					"Second",
				);

				const selected = toggleLibrarySelectedItem(
					toggleLibrarySelectedItem(
						createEmptyLibrarySelectionState(),
						first,
					),
					second,
				);

				expect(selectLibrarySelectedItems(selected)).toEqual([
					first,
					second,
				]);
				expect(createLibrarySelectedKeySet(selected)).toEqual(new Set([
					"media:1",
					"media:2",
				]));

				const deselectedFirst = toggleLibrarySelectedItem(
					selected,
					first,
				);

				expect(selectLibrarySelectedItems(deselectedFirst)).toEqual([ second ]);
				expect(deselectedFirst.selectedKeys).toEqual([ "media:2" ]);
			},
		);

		it(
			"removes selected keys without disturbing remaining selected item snapshots",
			() => {
				const first    = createLibraryItem("media:1");
				const second   = createLibraryItem("media:2");
				const third    = createLibraryItem("media:3");
				const selected = [
					first,
					second,
					third,
				].reduce(
					(state, item) => toggleLibrarySelectedItem(
						state,
						item,
					),
					createEmptyLibrarySelectionState(),
				);

				const next = removeLibrarySelectedKeys(
					selected,
					new Set([
						"media:1",
						"media:3",
					]),
				);

				expect(selectLibrarySelectedItems(next)).toEqual([ second ]);
				expect(next.selectedKeys).toEqual([ "media:2" ]);
			},
		);

		it(
			"updates only selected item snapshots",
			() => {
				const selectedItem   = createLibraryItem(
					"media:1",
					"Before",
				);
				const unselectedItem = createLibraryItem(
					"media:2",
					"Outside",
				);
				const selected       = toggleLibrarySelectedItem(
					createEmptyLibrarySelectionState(),
					selectedItem,
				);

				const unchanged = updateLibrarySelectedItem(
					selected,
					unselectedItem,
				);

				expect(unchanged).toBe(selected);

				const updatedItem = {
					...selectedItem,
					name: "After",
				};
				const updated     = updateLibrarySelectedItem(
					selected,
					updatedItem,
				);

				expect(updated).not.toBe(selected);
				expect(selectLibrarySelectedItems(updated)).toEqual([ updatedItem ]);
				expect(updated.selectedKeys).toEqual([ "media:1" ]);
			},
		);
	},
);
