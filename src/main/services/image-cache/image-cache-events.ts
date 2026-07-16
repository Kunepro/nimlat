import {
	BUS_GroupListChanged,
	BUS_GroupMediaListChanged,
	BUS_ImageCacheEntryReady,
	BUS_ImageDisplayTargetChanged,
	BUS_MediaEpisodesListChanged,
	type ImageCacheEntryReadyEvent,
	type ImageDisplayTarget,
	type ImageDisplayTargetChangedEvent,
} from "@nimlat/busses/main";
import { typeSafeError } from "@nimlat/functions";
import { LoggerUtils } from "@nimlat/loggers/main";
import {
	map,
	merge,
	type Observable,
	type Subscription,
} from "rxjs";

let subscription: Subscription | null = null;

type ImageDisplayInvalidationEvent =
	| {
	kind: "entry-ready";
	displayTarget: ImageDisplayTarget;
	logDetails: {
		cacheKey: string;
		ownerKind: ImageCacheEntryReadyEvent["ownerKind"];
		ownerId: string;
		imageRole: ImageCacheEntryReadyEvent["imageRole"];
		target: ImageDisplayTarget["kind"];
	};
}
	| {
	kind: "display-target-changed";
	displayTarget: ImageDisplayTarget;
	logDetails: {
		reason: ImageDisplayTargetChangedEvent["reason"];
		target: ImageDisplayTarget["kind"];
	};
};

function publishRendererInvalidation(displayTarget: ImageDisplayTarget): void {
	switch (displayTarget.kind) {
		case "media":
			BUS_GroupMediaListChanged.next({ affectedMediaIds: [ displayTarget.mediaId ] });
			return;
		case "group":
			BUS_GroupListChanged.next({ affectedGroups: [ displayTarget.group ] });
			return;
		case "episode":
			BUS_MediaEpisodesListChanged.next({ mediaId: displayTarget.mediaId });
			return;
		case "none":
			return;
	}
}

function resolveImageDisplayInvalidationLogContext(kind: ImageDisplayInvalidationEvent["kind"]): string {
	return kind === "entry-ready"
		? "image-cache-events.entry-ready"
		: "image-cache-events.display-target-changed";
}

function handleImageDisplayInvalidation(event: ImageDisplayInvalidationEvent): void {
	try {
		publishRendererInvalidation(event.displayTarget);
	} catch (error) {
		LoggerUtils.logMainServiceError(
			resolveImageDisplayInvalidationLogContext(event.kind),
			typeSafeError(error),
			event.logDetails,
		);
	}
}

function createImageDisplayInvalidationEvents(): Observable<ImageDisplayInvalidationEvent> {
	return merge(
		BUS_ImageCacheEntryReady.pipe(
			map((event): ImageDisplayInvalidationEvent => ({
				kind:          "entry-ready",
				displayTarget: event.displayTarget,
				logDetails:    {
					cacheKey:  event.cacheKey,
					ownerKind: event.ownerKind,
					ownerId:   event.ownerId,
					imageRole: event.imageRole,
					target:    event.displayTarget.kind,
				},
			})),
		),
		BUS_ImageDisplayTargetChanged.pipe(
			map((event): ImageDisplayInvalidationEvent => ({
				kind:          "display-target-changed",
				displayTarget: event.displayTarget,
				logDetails:    {
					reason: event.reason,
					target: event.displayTarget.kind,
				},
			})),
		),
	);
}

// Keep image-domain producers isolated from renderer invalidation policy. Cache
// readiness and gallery mutations publish facts; this pipeline owns the UI fan-out.
export function initImageCacheEvents(): void {
	if (subscription) {
		return;
	}

	subscription = createImageDisplayInvalidationEvents().subscribe({
		next: handleImageDisplayInvalidation,
	});
}

export function disposeImageCacheEvents(): void {
	subscription?.unsubscribe();
	subscription = null;
}
