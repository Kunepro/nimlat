function pad(value: number, size = 2): string {
	return value.toString().padStart(
		size,
		"0",
	);
}

function formatReadableTimestamp(timestamp: number): string {
	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) {
		return timestamp.toString();
	}

	return [
		date.getFullYear(),
		"-",
		pad(date.getMonth() + 1),
		"-",
		pad(date.getDate()),
		" ",
		pad(date.getHours()),
		":",
		pad(date.getMinutes()),
		":",
		pad(date.getSeconds()),
		".",
		pad(
			date.getMilliseconds(),
			3,
		),
	].join("");
}

export function formatConsoleLog(log: string): string {
	// Files keep raw epoch timestamps for sorting and tooling. Console output is
	// for humans during live debugging, so render timestamp lines in local time.
	return log.replace(
		/^timestamp: (\d{10,})$/gm,
		(_match, timestampText: string) => `timestamp: ${ formatReadableTimestamp(Number(timestampText)) }`,
	);
}
