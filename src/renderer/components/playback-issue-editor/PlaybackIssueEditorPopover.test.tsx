// @vitest-environment jsdom
import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import PlaybackIssueEditorPopover from "./PlaybackIssueEditorPopover";

let cleanupRender: (() => void) | null = null;
let originalMatchMedia: typeof window.matchMedia | undefined;

function createMatchMediaStub(): typeof window.matchMedia {
	return (query: string): MediaQueryList => ({
		matches:             false,
		media:               query,
		onchange:            null,
		addEventListener:    vi.fn(),
		addListener:         vi.fn(),
		dispatchEvent:       vi.fn(() => false),
		removeEventListener: vi.fn(),
		removeListener:      vi.fn(),
	});
}

async function flushPopoverWork(): Promise<void> {
	await Promise.resolve();
	await Promise.resolve();
}

function renderPopover(): HTMLButtonElement {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const root = createRoot(container);

	flushSync(() => {
		root.render(createElement(
			PlaybackIssueEditorPopover,
			{
				currentIntegrationStatus: null,
				onSave:                   vi.fn(() => Promise.resolve()),
				supportsMoments:          true,
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
		throw new Error("Playback issue popover did not render a trigger button.");
	}

	return button;
}

describe(
	"PlaybackIssueEditorPopover",
	() => {
		beforeEach(() => {
			originalMatchMedia = window.matchMedia;
			Object.defineProperty(
				window,
				"matchMedia",
				{
					configurable: true,
					value:        createMatchMediaStub(),
				},
			);
		});

		afterEach(() => {
			cleanupRender?.();
			cleanupRender = null;
			document.body.querySelectorAll(".ant-popover").forEach(popover => popover.remove());
			Object.defineProperty(
				window,
				"matchMedia",
				{
					configurable: true,
					value:        originalMatchMedia,
				},
			);
		});

		it(
			"opens the file issue form from the trigger button",
			async () => {
				const button = renderPopover();

				flushSync(() => {
					button.click();
				});
				await flushPopoverWork();

				expect(document.body.textContent).toContain("Issue note");
				expect(document.body.textContent).toContain("Dub issue");
			},
		);
	},
);
