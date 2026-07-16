export type UpstreamHttpErrorDetails = {
	url: string;
	statusText: string;
	retryAfter: string | null;
	headers: Record<string, string>;
	body: string | null;
};

export class UpstreamHttpError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly details: UpstreamHttpErrorDetails,
	) {
		super(details.body ? `${ message }: ${ details.body }` : message);
	}
}

function headersToRecord(headers: Headers): Record<string, string> {
	const output: Record<string, string> = {};
	headers.forEach((value, key) => {
		output[ key ] = value;
	});
	return output;
}

export async function readFetchErrorDetails(
	response: Response,
	url: string,
): Promise<UpstreamHttpErrorDetails> {
	let body: string | null = null;
	try {
		const text = await response.text();
		body       = text.trim().slice(
			0,
			2_000,
		) || null;
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
