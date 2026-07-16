export type JikanEndpointKind = "episodes" | "episode-details" | "episode-videos";

export type JikanHttpErrorDetails = {
	url: string;
	statusText: string;
	retryAfter: string | null;
	headers: Record<string, string>;
	body: string | null;
};

export type JikanResponseContext = {
	endpoint: JikanEndpointKind;
	malId: number;
	page: number;
	status: number;
	details: JikanHttpErrorDetails;
};

// Jikan failures must preserve provider detail. Hydration/error UIs depend on
// status, headers, retry-after, URL, and body to distinguish rate limits,
// malformed upstream payloads, and real missing resources.
export class JikanHttpError extends Error {
	constructor(
		public readonly status: number,
		public readonly endpoint: JikanEndpointKind,
		public readonly malId: number,
		public readonly page: number,
		public readonly details: JikanHttpErrorDetails,
	) {
		super(`Failed to fetch Jikan ${ endpoint } for MAL ${ malId }, page ${ page } (HTTP ${ status })${ details.body
			? `: ${ details.body }`
			: "" }`);
	}
}

// Jikan can occasionally return HTTP 200 with an error envelope or otherwise
// malformed JSON. Preserve the raw payload so exhausted retries are debuggable
// from logs and Errored Content without reproducing the transient response.
export class JikanMalformedPayloadError extends Error {
	public readonly status: number;
	public readonly endpoint: JikanEndpointKind;
	public readonly malId: number;
	public readonly page: number;
	public readonly details: JikanHttpErrorDetails;

	constructor(context: JikanResponseContext, reason: string) {
		const {
						status,
						endpoint,
						malId,
						page,
						details,
					} = context;
		super(`Malformed Jikan ${ endpoint } response for MAL ${ malId }, page ${ page } (HTTP ${ status }): ${ reason }${ details.body
			? `: ${ details.body }`
			: "" }`);
		this.status   = status;
		this.endpoint = endpoint;
		this.malId    = malId;
		this.page     = page;
		this.details  = details;
		this.name     = "JikanMalformedPayloadError";
	}
}
