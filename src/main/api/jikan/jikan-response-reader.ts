import {
	type JikanEndpointKind,
	type JikanHttpErrorDetails,
	JikanMalformedPayloadError,
} from "./jikan-errors";

function headersToRecord(headers: Headers): Record<string, string> {
	const output: Record<string, string> = {};
	headers.forEach((value, key) => {
		output[ key ] = value;
	});
	return output;
}

export function truncateJikanBody(body: string): string | null {
	const trimmed = body.trim();
	return trimmed.slice(
		0,
		1_000,
	) || null;
}

export async function readJikanHttpErrorDetails(response: Response, url: string): Promise<JikanHttpErrorDetails> {
	let body: string | null = null;
	try {
		body = truncateJikanBody(await response.text());
	} catch {
		// Missing error bodies are allowed; status/headers still identify the failed request.
	}

	return {
		url,
		statusText: response.statusText,
		retryAfter: response.headers.get("retry-after"),
		headers:    headersToRecord(response.headers),
		body,
	};
}

function buildJikanResponseDetails(response: Response, url: string, body: string | null): JikanHttpErrorDetails {
	return {
		url,
		statusText: response.statusText,
		retryAfter: response.headers.get("retry-after"),
		headers:    headersToRecord(response.headers),
		body,
	};
}

export async function readJikanSuccessPayload(
	response: Response,
	url: string,
	endpoint: JikanEndpointKind,
	malId: number,
	page: number,
): Promise<{ payload: unknown; details: JikanHttpErrorDetails }> {
	const rawBody = await response.text();
	const details = buildJikanResponseDetails(
		response,
		url,
		truncateJikanBody(rawBody),
	);

	try {
		return {
			payload: JSON.parse(rawBody) as unknown,
			details,
		};
	} catch {
		throw new JikanMalformedPayloadError(
			{
				status: response.status,
				endpoint,
				malId,
				page,
				details,
			},
			"response body was not valid JSON",
		);
	}
}
