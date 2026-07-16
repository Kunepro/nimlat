import type {
	RendererImageFetchRequest,
	RendererImageFetchResponse,
} from "@nimlat/types/ipc-payloads";
import {
	readFetchErrorDetails,
	UpstreamHttpError,
} from "../../api/http/upstream-http-error";
import {
	createTransparentImageResponse,
	MAX_RENDERER_IMAGE_BYTES,
	normalizeResponseContentType,
} from "./renderer-image-response";

const MAX_REMOTE_RENDERER_IMAGE_FETCHES = 3;
const REMOTE_IMAGE_FAILURE_COOLDOWN_MS  = 5 * 60 * 1000;

type FetchTask = {
	imageUrl: string;
	resolve: (response: RendererImageFetchResponse) => void;
	reject: (error: unknown) => void;
};

const queuedFetches: FetchTask[] = [];
const inFlightByUrl              = new Map<string, Promise<RendererImageFetchResponse>>();
const failedRemoteUntilByUrl     = new Map<string, number>();
let activeFetchCount             = 0;

function normalizeRemoteImageUrl(imageUrl: string): string {
	const normalizedUrl = imageUrl.trim().startsWith("//")
		? `https:${ imageUrl.trim() }`
		: imageUrl.trim();
	const parsedUrl     = new URL(normalizedUrl);
	if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
		throw new Error("Only HTTP(S) renderer image URLs can be fetched through the image bridge.");
	}
	return parsedUrl.toString();
}

function assertImageResponse(response: Response, imageUrl: string): void {
	const contentType = normalizeResponseContentType(response);
	if (contentType !== "application/octet-stream" && !contentType.startsWith("image/")) {
		throw new Error(`Renderer image bridge rejected non-image response ${ contentType } from ${ imageUrl }.`);
	}

	const declaredLength = Number(response.headers.get("content-length"));
	if (Number.isFinite(declaredLength) && declaredLength > MAX_RENDERER_IMAGE_BYTES) {
		throw new Error(`Renderer image bridge rejected oversized image ${ imageUrl }.`);
	}
}

// Remote thumbnails are fetched in main so Pixi receives renderer-owned bytes
// instead of CORS-tainted CDN image elements. Transient network/HTTP failures are
// cached briefly as transparent pixels to avoid hammering broken provider URLs.
export async function fetchRendererRemoteImage(request: RendererImageFetchRequest): Promise<RendererImageFetchResponse> {
	const imageUrl    = normalizeRemoteImageUrl(request.imageUrl);
	const failedUntil = failedRemoteUntilByUrl.get(imageUrl) ?? 0;
	if (failedUntil > Date.now()) {
		return createTransparentImageResponse();
	}
	const existing = inFlightByUrl.get(imageUrl);
	if (existing) {
		return existing;
	}

	const promise = enqueueFetch(imageUrl)
		.catch((error: unknown) => {
			if (!(error instanceof TypeError) && !(error instanceof UpstreamHttpError)) {
				throw error;
			}
			failedRemoteUntilByUrl.set(
				imageUrl,
				Date.now() + REMOTE_IMAGE_FAILURE_COOLDOWN_MS,
			);
			return createTransparentImageResponse();
		})
		.finally(() => {
			inFlightByUrl.delete(imageUrl);
		});
	inFlightByUrl.set(
		imageUrl,
		promise,
	);
	return promise;
}

function enqueueFetch(imageUrl: string): Promise<RendererImageFetchResponse> {
	return new Promise((resolve, reject) => {
		queuedFetches.push({
			imageUrl,
			resolve,
			reject,
		});
		pumpQueue();
	});
}

function pumpQueue(): void {
	while (activeFetchCount < MAX_REMOTE_RENDERER_IMAGE_FETCHES && queuedFetches.length > 0) {
		const task = queuedFetches.shift();
		if (!task) {
			return;
		}

		activeFetchCount += 1;
		void fetchNow(task.imageUrl)
			.then(
				task.resolve,
				task.reject,
			)
			.finally(() => {
				activeFetchCount -= 1;
				pumpQueue();
			});
	}
}

async function fetchNow(imageUrl: string): Promise<RendererImageFetchResponse> {
	const response = await fetch(imageUrl);
	if (!response.ok) {
		throw new UpstreamHttpError(
			`Renderer image bridge failed with HTTP ${ response.status } for ${ imageUrl }`,
			response.status,
			await readFetchErrorDetails(
				response,
				imageUrl,
			),
		);
	}

	assertImageResponse(
		response,
		imageUrl,
	);

	const bytes = await response.arrayBuffer();
	if (bytes.byteLength > MAX_RENDERER_IMAGE_BYTES) {
		throw new Error(`Renderer image bridge rejected oversized image ${ imageUrl }.`);
	}

	return {
		bytes,
		contentType: normalizeResponseContentType(response),
	};
}
