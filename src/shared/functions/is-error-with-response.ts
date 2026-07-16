export interface ErrorWithResponse extends Error {
	response?: {
		status?: number;
		headers?: Record<string, string | number | undefined>;
	};
}

export function isErrorWithResponse(error: unknown): error is ErrorWithResponse {
	return typeof error === "object" && error !== null && "response" in error;
}
