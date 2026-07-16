// @vitest-environment jsdom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import PlaybackIssueEditorTriggerButton from "./PlaybackIssueEditorTriggerButton";

let cleanupRender: (() => void) | null = null;

function renderTriggerButton(onClick: () => void): HTMLButtonElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);

	flushSync(() => {
		root.render(createElement(
			PlaybackIssueEditorTriggerButton,
			{
				buttonVariant:           "iconOnly",
				hasPlaybackIssue:        false,
				isSaving:                false,
				onClick,
				resolvedButtonLabel:     "Track file issues",
				shouldRenderButtonLabel: false,
			},
		));
	});

	cleanupRender = () => {
		flushSync(() => {
			root.unmount();
		});
		container.remove();
	};

	const button = container.querySelector("button");
	if (!(button instanceof HTMLButtonElement)) {
		throw new Error("Playback issue trigger did not render a button.");
	}

	return button;
}

describe(
	"PlaybackIssueEditorTriggerButton",
	() => {
		afterEach(() => {
			cleanupRender?.();
			cleanupRender = null;
		});

		it(
			"forwards trigger props to the underlying Ant button",
			() => {
				const onClick = vi.fn();
				const button  = renderTriggerButton(onClick);

				button.click();

				expect(onClick).toHaveBeenCalledTimes(1);
			},
		);
	},
);
