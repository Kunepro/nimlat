import {
	BUS_ImageDisplayTargetChanged,
	type ImageDisplayTarget,
	type ImageDisplayTargetChangedEvent,
} from "@nimlat/busses/main";
import type { GroupRef } from "@nimlat/types/nimlat-ids";

export function createMediaDisplayTarget(mediaId: number): ImageDisplayTarget {
	return {
		kind: "media",
		mediaId,
	};
}

export function createGroupDisplayTarget(group: GroupRef): ImageDisplayTarget {
	return {
		kind: "group",
		group,
	};
}

export function createEpisodeDisplayTarget(mediaId: number): ImageDisplayTarget {
	return {
		kind: "episode",
		mediaId,
	};
}

export function publishImageDisplayTargetChanged(
	displayTarget: ImageDisplayTarget,
	reason: ImageDisplayTargetChangedEvent["reason"],
): void {
	BUS_ImageDisplayTargetChanged.next({
		displayTarget,
		reason,
	});
}
