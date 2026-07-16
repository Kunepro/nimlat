import type { ExternalTrackingAccountSecretRow } from "@nimlat/database";

interface HttpErrorDetails {
	status: number;
	statusText: string;
	body: string;
	url: string;
}

class ExternalTrackingHttpError extends Error {
	details: HttpErrorDetails;

	constructor(message: string, details: HttpErrorDetails) {
		super(message);
		this.name    = "ExternalTrackingHttpError";
		this.details = details;
	}
}

export class ExternalTrackingAuthenticationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "ExternalTrackingAuthenticationError";
	}
}

export function getExternalTrackingHttpStatus(error: unknown): number | null {
	return error instanceof ExternalTrackingHttpError ? error.details.status : null;
}

export function asRecord(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

export function asNumber(value: unknown): number | null {
	return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function asString(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function parseIsoDate(value: unknown): number | null {
	const text = asString(value);
	if (!text) {
		return null;
	}

	const time = Date.parse(text);
	return Number.isFinite(time) ? time : null;
}

export async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
	const response = await fetch(
		url,
		init,
	);
	const text     = await response.text();
	if (!response.ok) {
		throw new ExternalTrackingHttpError(
			`External tracking request failed with ${ response.status } ${ response.statusText }`,
			{
				status:     response.status,
				statusText: response.statusText,
				body:       text.slice(
					0,
					2000,
				),
				url,
			},
		);
	}

	if (text.trim().length === 0) {
		return null;
	}

	return JSON.parse(text) as unknown;
}

export function requireAccessToken(account: ExternalTrackingAccountSecretRow): string {
	if (!account.accessToken) {
		throw new Error(`${ account.provider } account is missing an access token.`);
	}

	return account.accessToken;
}
