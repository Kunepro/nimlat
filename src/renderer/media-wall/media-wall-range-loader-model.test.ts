import {
	describe,
	expect,
	it,
} from "vitest";
import { calculateMediaWallLayout } from "./media-wall-layout";
import {
	advanceMediaWallRangeGeneration,
	createPendingRangeRequest,
	isSamePendingRangeRequest,
	resolveRangeRequestSettlement,
	resolveReloadRangeRequest,
	resolveVisibleRangeRequest,
} from "./media-wall-range-loader-model";

describe(
	"media-wall-range-loader-model",
	() => {
		it(
			"normalizes range requests and detects duplicate pending work",
			() => {
				const request = createPendingRangeRequest(
					-3.7,
					0.2,
					4,
				);

				expect(request).toEqual({
					generation: 4,
					offset:     0,
					limit:      1,
				});
				expect(isSamePendingRangeRequest(
					request,
					createPendingRangeRequest(
						0,
						1,
						4,
					),
				)).toBe(true);
				expect(isSamePendingRangeRequest(
					request,
					createPendingRangeRequest(
						0,
						1,
						5,
					),
				)).toBe(false);
				expect(isSamePendingRangeRequest(
					null,
					request,
				)).toBe(false);
			},
		);

		it(
			"advances generations and accepts only the request that is still pending",
			() => {
				const firstRequest       = createPendingRangeRequest(
					0,
					120,
					1,
				);
				const supersedingRequest = createPendingRangeRequest(
					240,
					120,
					1,
				);

				expect(advanceMediaWallRangeGeneration(1)).toBe(2);
				expect(resolveRangeRequestSettlement({
					activeGeneration:      1,
					currentPendingRequest: firstRequest,
					request:               firstRequest,
				})).toEqual({
					nextPendingRequest: null,
					shouldHandle:       true,
				});
				expect(resolveRangeRequestSettlement({
					activeGeneration:      1,
					currentPendingRequest: supersedingRequest,
					request:               firstRequest,
				})).toEqual({
					nextPendingRequest: supersedingRequest,
					shouldHandle:       false,
				});
				expect(resolveRangeRequestSettlement({
					activeGeneration:      2,
					currentPendingRequest: firstRequest,
					request:               firstRequest,
				})).toEqual({
					nextPendingRequest: firstRequest,
					shouldHandle:       false,
				});
			},
		);

		it(
			"returns no visible request when the loaded range already covers the viewport",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});

				expect(resolveVisibleRangeRequest({
					layout,
					maximumRequestItems: 512,
					range:               {
						offset: 0,
						total:  20_000,
						items:  Array.from({ length: 200 }),
					},
					scrollTop:           0,
				})).toBeNull();
			},
		);

		it(
			"centers an adaptive request when the viewport enters the reload threshold",
			() => {
				const layout    = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});
				const scrollTop = layout.contentInsetTop + (layout.rowHeight * 50);

				expect(resolveVisibleRangeRequest({
					layout,
					maximumRequestItems: 512,
					range:               {
						offset: 0,
						total:  20_000,
						items:  Array.from({ length: 120 }),
					},
					scrollTop,
				})).toEqual({
					offset: (47 * layout.columns) - 120,
					limit:  280,
				});
			},
		);

		it(
			"scrolls eight viewport heights before reaching the reload threshold",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});
				const range  = {
					offset: (47 * layout.columns) - 120,
					total:  20_000,
					items:  Array.from({ length: 280 }),
				};

				expect(resolveVisibleRangeRequest({
					layout,
					maximumRequestItems: 512,
					range,
					scrollTop:           layout.contentInsetTop + (layout.rowHeight * 66),
				})).toBeNull();
				expect(resolveVisibleRangeRequest({
					layout,
					maximumRequestItems: 512,
					range,
					scrollTop:           layout.contentInsetTop + (layout.rowHeight * 67),
				})).toEqual({
					offset: 200,
					limit:  280,
				});
			},
		);

		it(
			"does not supersede a pending request that covers the retained range",
			() => {
				const layout    = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});
				const scrollTop = layout.contentInsetTop + (layout.rowHeight * 50);

				expect(resolveVisibleRangeRequest({
					layout,
					maximumRequestItems: 512,
					pendingRequest:      createPendingRangeRequest(
						(47 * layout.columns) - 120,
						280,
						1,
					),
					range:               {
						offset: 0,
						total:  20_000,
						items:  Array.from({ length: 120 }),
					},
					scrollTop,
				})).toBeNull();
			},
		);

		it(
			"caps adaptive requests independently of catalog size",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1920,
					viewportHeight: 1080,
					itemCount:      100_000,
				});

				expect(resolveReloadRangeRequest(
					layout,
					layout.contentInsetTop + (layout.rowHeight * 500),
					512,
				).limit).toBe(512);
			},
		);

		it(
			"uses the current layout for reload requests and falls back before layout is ready",
			() => {
				const layout = calculateMediaWallLayout({
					viewportWidth:  1400,
					viewportHeight: 800,
					itemCount:      20_000,
				});

				expect(resolveReloadRangeRequest(
					null,
					500,
					120,
				)).toEqual({
					offset: 0,
					limit:  120,
				});
				expect(resolveReloadRangeRequest(
					layout,
					layout.contentInsetTop + (layout.rowHeight * 12),
					120,
				)).toEqual({
					offset: (9 * layout.columns) - 40,
					limit:  120,
				});
			},
		);
	},
);
