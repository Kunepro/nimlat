// @vitest-environment node
import {
	describe,
	expect,
	it,
} from "vitest";
import { createPixiMediaWallCardRenderState } from "./pixi-media-wall-card-state";

describe(
	"pixi media-wall card state",
	() => {
		it(
			"combines hover, focus, selection, terminal, and exiting state for a bound card",
			() => {
				const selectedIndexes = new Set([ 4 ]);
				const state           = createPixiMediaWallCardRenderState({
					globalIndex:           4,
					itemPresent:           true,
					mappedItemId:          "media-4",
					hoveredIndex:          4,
					projectorHoveredIndex: 4,
					selectedIndex:         null,
					selectedIndexes,
					focusedIndex:          4,
					actionTerminalState:   {
						kind:        "menu",
						index:       4,
						startedAtMs: 100,
					},
					exitingCardTarget:     {
						index:       4,
						itemId:      "media-4",
						startedAtMs: 200,
					},
				});

				expect(state).toMatchObject({
					hovered:            true,
					projectorHovered:   true,
					actionMenuOpen:     true,
					exitingStartedAtMs: 200,
					selected:           true,
					itemSelected:       true,
					focused:            true,
					placeholder:        false,
					effectsEnabled:     true,
				});
				expect(state.terminalState?.kind).toBe("menu");
			},
		);

		it(
			"ignores stale terminal and exit state for recycled card slots",
			() => {
				const state = createPixiMediaWallCardRenderState({
					globalIndex:           5,
					itemPresent:           false,
					mappedItemId:          null,
					hoveredIndex:          4,
					projectorHoveredIndex: null,
					selectedIndex:         5,
					selectedIndexes:       new Set([ 4 ]),
					focusedIndex:          null,
					actionTerminalState:   {
						kind:        "menu",
						index:       4,
						startedAtMs: 100,
					},
					exitingCardTarget:     {
						index:       5,
						itemId:      "previous-media",
						startedAtMs: 200,
					},
				});

				expect(state).toMatchObject({
					hovered:            false,
					projectorHovered:   false,
					actionMenuOpen:     false,
					exitingStartedAtMs: null,
					selected:           true,
					itemSelected:       false,
					focused:            false,
					placeholder:        true,
				});
				expect(state.terminalState).toBeNull();
			},
		);
	},
);
