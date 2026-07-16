export function formatHydrationQueueErrorLog(
	queueName: string,
	mediaId: number,
	timestamp: number,
	error: Error,
): string {
	const errorDetails  = error as Error & {
		status?: unknown;
		endpoint?: unknown;
		malId?: unknown;
		page?: unknown;
		details?: {
			url?: unknown;
			statusText?: unknown;
			retryAfter?: unknown;
			headers?: unknown;
			body?: unknown;
		};
	};
	const upstreamLines = [
		typeof errorDetails.status === "number" ? `upstream.status: ${ errorDetails.status }` : undefined,
		typeof errorDetails.endpoint === "string" ? `upstream.endpoint: ${ errorDetails.endpoint }` : undefined,
		typeof errorDetails.malId === "number" ? `upstream.malId: ${ errorDetails.malId }` : undefined,
		typeof errorDetails.page === "number" ? `upstream.page: ${ errorDetails.page }` : undefined,
		typeof errorDetails.details?.url === "string" ? `upstream.url: ${ errorDetails.details.url }` : undefined,
		typeof errorDetails.details?.statusText === "string"
			? `upstream.statusText: ${ errorDetails.details.statusText }`
			: undefined,
		typeof errorDetails.details?.retryAfter === "string"
			? `upstream.retryAfter: ${ errorDetails.details.retryAfter }`
			: undefined,
		errorDetails.details?.headers ? `upstream.headers: ${ JSON.stringify(errorDetails.details.headers) }` : undefined,
		typeof errorDetails.details?.body === "string" ? `upstream.body: ${ errorDetails.details.body }` : undefined,
	].filter((line): line is string => typeof line === "string");

	return [
		"[hydration-queue-error]",
		`timestamp: ${ timestamp }`,
		`queue: ${ queueName }`,
		`mediaId: ${ mediaId }`,
		`message: ${ error.message }`,
		...upstreamLines,
		`stack: ${ error.stack || "n/a" }`,
	].join("\n");
}
