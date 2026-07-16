// Download cancellation must be checked at every phase boundary, not only while
// bytes are streaming, because checksum/reconcile/replace can otherwise promote
// a DB after the user has already canceled the workflow.
export function createAnimeDbDownloadAbortError(phase: string): Error {
	const error = new Error(`AnimeDB download canceled during ${ phase }.`);
	error.name  = "AbortError";
	return error;
}

export function throwIfAnimeDbDownloadAborted(
	signal: AbortSignal,
	phase: string,
): void {
	if (signal.aborted) {
		throw createAnimeDbDownloadAbortError(phase);
	}
}
