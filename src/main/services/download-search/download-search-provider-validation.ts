import { buildDownloadSearchProviderUrl } from "@nimlat/functions";
import type {
	CreateDownloadSearchKeywordPresetRequest,
	CreateDownloadSearchProviderRequest,
	CreateDownloadSearchQueryPresetRequest,
	UpdateDownloadSearchProviderRequest,
} from "@nimlat/types/download-search";

type DownloadSearchProviderWriteRequest =
	| CreateDownloadSearchProviderRequest
	| UpdateDownloadSearchProviderRequest;

export function validateDownloadSearchProviderRequest<T extends DownloadSearchProviderWriteRequest>(request: T): T {
	const label       = request.label.trim();
	const urlTemplate = request.baseUrl.trim();
	if (label.length === 0) {
		throw new Error("Download search provider requires a name.");
	}
	if (urlTemplate.length === 0) {
		throw new Error("Download search provider requires a search URL.");
	}
	if (urlTemplate.split("{query}").length > 2) {
		throw new Error("Download search provider URL template can include {query} at most once.");
	}
	try {
		buildDownloadSearchProviderUrl(
			{
				baseUrl: urlTemplate,
			},
			"test",
		);
	} catch {
		throw new Error("Download search provider URL template is not a valid HTTP or HTTPS URL.");
	}
	return {
		...request,
		label,
		baseUrl: urlTemplate,
	};
}

export function validateDownloadSearchKeywordPresetRequest(request: CreateDownloadSearchKeywordPresetRequest): CreateDownloadSearchKeywordPresetRequest {
	if (request.label.trim().length === 0 || request.value.trim().length === 0) {
		throw new Error("Custom download search preset requires a label and value.");
	}
	return request;
}

export function validateDownloadSearchQueryPresetRequest(request: CreateDownloadSearchQueryPresetRequest): CreateDownloadSearchQueryPresetRequest {
	if (request.label.trim().length === 0) {
		throw new Error("Download search preset requires a name.");
	}
	return request;
}
