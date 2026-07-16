/**
 * Parse a user-entered timestamp like `11:40` or `1:02:05` into whole seconds.
 * Returns `null` for invalid formats so form validation can block submission.
 */
export function parsePlaybackIssueTimestampText(timestampText: string): number | null {
	const normalizedTimestampText = timestampText.trim();
	if (!normalizedTimestampText) {
		return null;
	}

	const parts = normalizedTimestampText.split(":");
	if (parts.length < 2 || parts.length > 3) {
		return null;
	}

	const numericParts = parts.map((part) => {
		if (!/^\d+$/.test(part)) {
			return NaN;
		}
		return Number.parseInt(
			part,
			10,
		);
	});
	if (numericParts.some(Number.isNaN)) {
		return null;
	}

	if (parts.length === 2) {
		const [ minutes, seconds ] = numericParts;
		if (seconds >= 60) {
			return null;
		}
		return minutes * 60 + seconds;
	}

	const [ hours, minutes, seconds ] = numericParts;
	if (minutes >= 60 || seconds >= 60) {
		return null;
	}

	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Format a stored second offset back into a human-editable timestamp string.
 */
export function formatPlaybackIssueTimestampSeconds(timeSeconds: number): string {
	const safeTimeSeconds = Math.max(
		0,
		Math.floor(timeSeconds),
	);
	const hours           = Math.floor(safeTimeSeconds / 3600);
	const minutes         = Math.floor((safeTimeSeconds % 3600) / 60);
	const seconds         = safeTimeSeconds % 60;

	if (hours > 0) {
		return `${ hours }:${ minutes.toString().padStart(
			2,
			"0",
		) }:${ seconds.toString().padStart(
			2,
			"0",
		) }`;
	}

	return `${ minutes }:${ seconds.toString().padStart(
		2,
		"0",
	) }`;
}
