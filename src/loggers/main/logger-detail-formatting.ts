function truncateLogValue(value: string): string {
	return value.length > 2_000 ? `${ value.slice(
		0,
		2_000,
	) }...` : value;
}

export function stringifyLogValue(value: unknown): string {
	if (typeof value === "string") {
		return truncateLogValue(value);
	}

	try {
		return truncateLogValue(JSON.stringify(value));
	} catch {
		return String(value);
	}
}

function getHeaderValue(headers: unknown, headerName: string): unknown {
	if (!headers) {
		return undefined;
	}

	if (headers instanceof Headers) {
		return headers.get(headerName);
	}

	if (typeof headers === "object") {
		const normalizedHeaderName = headerName.toLowerCase();
		const entry                = Object.entries(headers as Record<string, unknown>)
			.find(([ key ]) => key.toLowerCase() === normalizedHeaderName);
		return entry?.[ 1 ];
	}

	return undefined;
}

// Node/undici fetch failures usually surface as `TypeError: fetch failed`,
// with DNS/TLS/socket diagnostics on `cause`. Preserve those fields so
// network-heavy paths can be debugged without reproducing under a debugger.
// noinspection OverlyComplexFunctionJS,FunctionWithMoreThanThreeNegationsJS
function getErrorCauseDetails(error: Error): Record<string, unknown> {
	const cause = (error as Error & { cause?: unknown }).cause;
	if (!cause || typeof cause !== "object") {
		return {};
	}

	const causeRecord                      = cause as Record<string, unknown>;
	const details: Record<string, unknown> = {};
	if (typeof causeRecord.name === "string") details.errorCauseName = causeRecord.name;
	if (typeof causeRecord.message === "string") details.errorCauseMessage = causeRecord.message;
	if (causeRecord.code !== undefined) details.errorCauseCode = causeRecord.code;
	if (causeRecord.errno !== undefined) details.errorCauseErrno = causeRecord.errno;
	if (causeRecord.syscall !== undefined) details.errorCauseSyscall = causeRecord.syscall;
	if (causeRecord.hostname !== undefined) details.errorCauseHostname = causeRecord.hostname;
	if (causeRecord.host !== undefined) details.errorCauseHost = causeRecord.host;
	if (causeRecord.address !== undefined) details.errorCauseAddress = causeRecord.address;
	if (causeRecord.port !== undefined) details.errorCausePort = causeRecord.port;
	if (typeof causeRecord.stack === "string") details.errorCauseStack = causeRecord.stack;

	return details;
}

// Provider/API errors often carry the real cause outside `message`
// (GraphQL response data, HTTP body, retry-after, request variables).
// Keep this extraction broad so queue and service logs do not collapse to
// opaque "HTTP 500" messages.
// noinspection FunctionWithMoreThanThreeNegationsJS,OverlyComplexFunctionJS
export function getUpstreamErrorDetails(error: Error): Record<string, unknown> {
	const candidate                        = error as Error & {
		status?: unknown;
		statusCode?: unknown;
		endpoint?: unknown;
		malId?: unknown;
		page?: unknown;
		response?: {
			status?: unknown;
			statusText?: unknown;
			headers?: unknown;
			data?: unknown;
			errors?: unknown;
			message?: unknown;
			url?: unknown;
		};
		request?: {
			query?: unknown;
			variables?: unknown;
		};
		details?: {
			statusText?: unknown;
			retryAfter?: unknown;
			body?: unknown;
			headers?: unknown;
			url?: unknown;
		};
	};
	const response                         = candidate.response;
	const details: Record<string, unknown> = getErrorCauseDetails(error);
	if (error.name) details.errorName = error.name;
	const upstreamStatus = candidate.status ?? candidate.statusCode ?? response?.status;
	if (upstreamStatus !== undefined) details.upstreamStatus = upstreamStatus;
	if (response?.statusText !== undefined) details.upstreamStatusText = response.statusText;
	if (candidate.endpoint !== undefined) details.upstreamEndpoint = candidate.endpoint;
	if (candidate.malId !== undefined) details.upstreamMalId = candidate.malId;
	if (candidate.page !== undefined) details.upstreamPage = candidate.page;
	if (candidate.details?.url !== undefined || response?.url !== undefined) details.upstreamUrl = candidate.details?.url ?? response?.url;
	const retryAfter = candidate.details?.retryAfter ?? getHeaderValue(
		response?.headers,
		"retry-after",
	);
	if (retryAfter !== undefined && retryAfter !== null) details.upstreamRetryAfter = retryAfter;
	if (candidate.details?.statusText !== undefined) details.upstreamStatusText = candidate.details.statusText;
	if (candidate.details?.body !== undefined && candidate.details.body !== null) details.upstreamBody = stringifyLogValue(candidate.details.body);
	if (response?.data !== undefined) details.upstreamResponseData = stringifyLogValue(response.data);
	if (response?.errors !== undefined) details.upstreamErrors = stringifyLogValue(response.errors);
	if (response?.message !== undefined) details.upstreamMessage = stringifyLogValue(response.message);
	if (candidate.request?.query !== undefined) details.upstreamRequestQuery = stringifyLogValue(candidate.request.query);
	if (candidate.request?.variables !== undefined) details.upstreamRequestVariables = stringifyLogValue(candidate.request.variables);
	if (candidate.details?.headers !== undefined) details.upstreamHeaders = stringifyLogValue(candidate.details.headers);
	else if (response?.headers !== undefined) details.upstreamHeaders = stringifyLogValue(response.headers);

	return details;
}

export function formatDetailsLines(details?: Record<string, unknown>): string[] {
	return details
		? Object.entries(details).map(([ key, value ]) => `detail.${ key }: ${ stringifyLogValue(value) }`)
		: [];
}
