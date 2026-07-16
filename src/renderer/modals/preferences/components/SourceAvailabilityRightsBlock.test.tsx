// @vitest-environment jsdom

import { createElement } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import {
	describe,
	expect,
	it,
} from "vitest";
import notice from "../../../../../NOTICE.md?raw";
import SourceAvailabilityRightsBlock from "./SourceAvailabilityRightsBlock";

const normalizeWhitespace = (value: string): string => value.replace(
	/\s+/gu,
	" ",
).trim();

function readCanonicalRightsParagraphs(): string[] {
	const [ rightsSection ] = notice.split("\n## Design Philosophy");

	if (!rightsSection) {
		throw new Error("NOTICE.md does not contain the copyright and source availability section.");
	}

	return rightsSection
		.replace(
			/^## Copyright and Source Availability\s+/u,
			"",
		)
		.trim()
		.split(/\n\s*\n/u)
		.map(normalizeWhitespace);
}

describe(
	"SourceAvailabilityRightsBlock",
	() => {
		it(
			"matches the canonical rights copy in NOTICE.md",
			() => {
				const container = document.createElement("div");
				const root      = createRoot(container);

				flushSync(() => {
					root.render(createElement(SourceAvailabilityRightsBlock));
				});

				const renderedParagraphs = Array.from(container.querySelectorAll("p"))
					.map(paragraph => normalizeWhitespace(paragraph.textContent ?? ""));

				expect(renderedParagraphs).toEqual(readCanonicalRightsParagraphs());

				flushSync(() => {
					root.unmount();
				});
			},
		);

		it(
			"renders the rights notice as a collapsed native disclosure",
			() => {
				const container = document.createElement("div");
				const root      = createRoot(container);

				flushSync(() => {
					root.render(createElement(SourceAvailabilityRightsBlock));
				});

				const disclosure = container.querySelector("details");
				expect(disclosure?.open).toBe(false);
				expect(disclosure?.querySelector("summary")?.textContent).toContain(
					"Copyright and Source Availability",
				);

				flushSync(() => {
					root.unmount();
				});
			},
		);
	},
);
