import {
	CanvasTextMetrics,
	TextStyle,
} from "pixi.js";

const TITLE_MAX_LINES       = 2;
const TITLE_OVERFLOW_SUFFIX = "...";

function getMeasuredLines(title: string, style: TextStyle): string[] {
	return CanvasTextMetrics.measureText(
		title,
		style,
		undefined,
		true,
	).lines;
}

function fitsSingleCanvasLine(title: string, style: TextStyle): boolean {
	const measured = CanvasTextMetrics.measureText(
		title,
		style,
		undefined,
		false,
	);
	return measured.width <= style.wordWrapWidth;
}

function truncateTextToSingleCanvasLine(title: string, style: TextStyle): string {
	const titleCharacters = Array.from(title.trimEnd());
	let lowerBound        = 0;
	let upperBound        = titleCharacters.length;
	let bestTitle         = TITLE_OVERFLOW_SUFFIX;

	while (lowerBound <= upperBound) {
		const middleIndex = Math.floor((lowerBound + upperBound) / 2);
		const candidate   = `${ titleCharacters
			.slice(
				0,
				middleIndex,
			)
			.join("")
			.trimEnd() }${ TITLE_OVERFLOW_SUFFIX }`;

		if (fitsSingleCanvasLine(
			candidate,
			style,
		)) {
			bestTitle  = candidate;
			lowerBound = middleIndex + 1;
		} else {
			upperBound = middleIndex - 1;
		}
	}

	return bestTitle;
}

// Pixi canvas text wraps but does not clamp lines for us, so the renderer
// measures the actual wrapped result and constrains only the second row.
export function truncateCanvasTitleToTwoLines(title: string, style: TextStyle): string {
	const measuredLines = getMeasuredLines(
		title,
		style,
	);
	if (measuredLines.length <= TITLE_MAX_LINES) {
		return title;
	}

	const firstLine       = measuredLines[ 0 ] ?? "";
	const secondLineStart = title.indexOf(firstLine) + firstLine.length;
	const secondLineText  = title
		.slice(secondLineStart)
		.trimStart();

	return `${ firstLine }\n${ truncateTextToSingleCanvasLine(
		secondLineText,
		style,
	) }`;
}
