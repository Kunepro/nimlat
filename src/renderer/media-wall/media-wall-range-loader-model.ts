import type {
	MediaWallLayout,
	MediaWallLoadedRange,
} from "../types/media-wall";
import {
	isRangeCovered,
	resolveRequestedRange,
} from "./media-wall-host.utils";
import { calculateMediaWallVisibleRange } from "./media-wall-layout";

const RANGE_RELOAD_THRESHOLD_VIEWPORTS_PER_SIDE = 4;

export interface MediaWallPendingRangeRequest {
	generation: number;
	offset: number;
	limit: number;
}

export interface MediaWallRangeRequestSettlement {
	nextPendingRequest: MediaWallPendingRangeRequest | null;
	shouldHandle: boolean;
}

export function advanceMediaWallRangeGeneration(currentGeneration: number): number {
	return currentGeneration + 1;
}

export function createPendingRangeRequest(
	offset: number,
	limit: number,
	generation: number,
): MediaWallPendingRangeRequest {
	return {
		generation,
		offset: Math.max(
			0,
			Math.floor(offset),
		),
		limit:  Math.max(
			1,
			Math.floor(limit),
		),
	};
}

export function isSamePendingRangeRequest(
	left: MediaWallPendingRangeRequest | null,
	right: MediaWallPendingRangeRequest,
): boolean {
	return left !== null
		&& left.generation === right.generation
		&& left.offset === right.offset
		&& left.limit === right.limit;
}

// Only the request that is still registered as pending may publish a range.
// Superseded responses are stale even when they belong to the active data generation.
export function resolveRangeRequestSettlement(params: {
	activeGeneration: number;
	currentPendingRequest: MediaWallPendingRangeRequest | null;
	request: MediaWallPendingRangeRequest;
}): MediaWallRangeRequestSettlement {
	const {
					activeGeneration,
					currentPendingRequest,
					request,
				}            = params;
	const shouldHandle = activeGeneration === request.generation
		&& isSamePendingRangeRequest(
			currentPendingRequest,
			request,
		);

	return {
		nextPendingRequest: shouldHandle ? null : currentPendingRequest,
		shouldHandle,
	};
}

export function resolveVisibleRangeRequest<TItem>({
																			layout,
																			maximumRequestItems,
																			pendingRequest,
																			range,
																			scrollTop,
}: {
	layout: MediaWallLayout;
	maximumRequestItems: number;
	pendingRequest?: MediaWallPendingRangeRequest | null;
	range: MediaWallLoadedRange<TItem>;
	scrollTop: number;
}): { offset: number; limit: number } | null {
	const viewportRows  = Math.max(
		1,
		Math.ceil(layout.viewportHeight / layout.rowHeight),
	);
	const retainedRange = calculateMediaWallVisibleRange(
		layout,
		scrollTop,
		layout.overscanRows + (viewportRows * RANGE_RELOAD_THRESHOLD_VIEWPORTS_PER_SIDE),
	);
	// Refill only after the viewport enters the low-watermark zone. The larger
	// requested range and smaller retained range form hysteresis, preventing
	// row-by-row IPC reads while starting the next read before data runs out.
	if (isRangeCovered(
		range,
		retainedRange.firstIndex,
		retainedRange.lastIndexExclusive,
	)) {
		return null;
	}
	if (
		pendingRequest
		&& pendingRequest.offset <= retainedRange.firstIndex
		&& pendingRequest.offset + pendingRequest.limit >= retainedRange.lastIndexExclusive
	) {
		// A fast wheel gesture can emit more frames before IPC settles. Do not
		// supersede an in-flight range that already covers the new viewport.
		return null;
	}

	return resolveRequestedRange(
		layout,
		scrollTop,
		maximumRequestItems,
	);
}

export function resolveReloadRangeRequest(
	layout: MediaWallLayout | null,
	scrollTop: number,
	maximumRequestItems: number,
): { offset: number; limit: number } {
	return layout
		? resolveRequestedRange(
			layout,
			scrollTop,
			maximumRequestItems,
		)
		: {
			offset: 0,
			limit:  maximumRequestItems,
		};
}
