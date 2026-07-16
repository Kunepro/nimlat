import { typeSafeError } from "@nimlat/functions";
import {
	createServer,
	type Server,
} from "node:http";

const CALLBACK_TIMEOUT_MS = 5 * 60 * 1000;
const LOOPBACK_HOSTS      = new Set([
	"127.0.0.1",
	"localhost",
]);

interface ActiveLoopbackCallback {
	server: Server;
	timeout: NodeJS.Timeout;
}

interface StartExternalTrackingLoopbackCallbackOptions {
	providerLabel: string;
	redirectUri: string;
	onRedirect: (redirectResult: string) => Promise<void>;
}

let activeCallback: ActiveLoopbackCallback | null = null;

function renderCallbackPage(title: string, message: string, isError = false): string {
	const escapedTitle   = escapeHtml(title);
	const escapedMessage = escapeHtml(message);
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${ escapedTitle }</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#07131f;color:#d9f7ff;font:16px system-ui,sans-serif}.card{max-width:38rem;margin:2rem;padding:2rem;border:1px solid ${ isError
		? "#ff6b81"
		: "#53ffb1" };border-radius:12px;background:#0d2130}h1{margin-top:0;color:${ isError ? "#ff91a4" : "#9af7c9" }}p{line-height:1.55}</style>
</head>
<body><main class="card"><h1>${ escapedTitle }</h1><p>${ escapedMessage }</p></main></body>
</html>`;
}

function escapeHtml(value: string): string {
	return value
		.replaceAll(
			"&",
			"&amp;",
		)
		.replaceAll(
			"<",
			"&lt;",
		)
		.replaceAll(
			">",
			"&gt;",
		)
		.replaceAll(
			"\"",
			"&quot;",
		)
		.replaceAll(
			"'",
			"&#39;",
		);
}

function closeActiveCallback(): Promise<void> {
	const current = activeCallback;
	if (!current) {
		return Promise.resolve();
	}

	activeCallback = null;
	clearTimeout(current.timeout);
	return new Promise((resolve) => {
		if (!current.server.listening) {
			resolve();
			return;
		}
		current.server.close(() => resolve());
	});
}

// OAuth providers redirect the browser to this short-lived loopback listener.
// Binding only the registered loopback host keeps the authorization code out of
// the renderer and removes the stale-copy race from the former manual flow.
export async function startExternalTrackingLoopbackCallback({
																															providerLabel,
																															redirectUri,
																															onRedirect,
																														}: StartExternalTrackingLoopbackCallbackOptions): Promise<void> {
	const redirectUrl = new URL(redirectUri);
	if (redirectUrl.protocol !== "http:" || !LOOPBACK_HOSTS.has(redirectUrl.hostname) || !redirectUrl.port) {
		throw new Error("Redirect URI must use http://127.0.0.1 or http://localhost with an explicit port.");
	}

	await closeActiveCallback();

	const server = createServer((request, response) => {
		const requestUrl = new URL(
			request.url ?? "/",
			redirectUrl.origin,
		);
		if (request.method !== "GET" || requestUrl.pathname !== redirectUrl.pathname) {
			response.writeHead(404).end("Not found");
			return;
		}

		void closeActiveCallback();
		void onRedirect(requestUrl.toString())
			.then(() => {
				response.writeHead(
					200,
					{ "Content-Type": "text/html; charset=utf-8" },
				);
				response.end(renderCallbackPage(
					`${ providerLabel } connected`,
					"The connection is complete. You can close this tab and return to Nimlat.",
				));
			})
			.catch((error: unknown) => {
				const message = typeSafeError(error).message;
				response.writeHead(
					400,
					{ "Content-Type": "text/html; charset=utf-8" },
				);
				response.end(renderCallbackPage(
					`${ providerLabel } connection failed`,
					message,
					true,
				));
			});
	});

	await new Promise<void>((resolve, reject) => {
		server.once(
			"error",
			reject,
		);
		server.listen(
			Number(redirectUrl.port),
			redirectUrl.hostname,
			() => {
				server.removeListener(
					"error",
					reject,
				);
				resolve();
			},
		);
	});

	const timeout = setTimeout(
		() => void closeActiveCallback(),
		CALLBACK_TIMEOUT_MS,
	);
	timeout.unref();
	activeCallback = {
		server,
		timeout,
	};
}

export function disposeExternalTrackingLoopbackCallback(): Promise<void> {
	return closeActiveCallback();
}
