import {
	expect,
	test,
} from "@playwright/test";
import { inflateSync } from "node:zlib";
import type { NimlatE2ETestContext } from "../e2e-test-context";
import {
	evaluateRenderer,
	openHarnessPage,
	runMainCommand,
	runMediaWallTerminalAction,
	wait,
	waitForRendererCondition,
} from "../playwright-electron-helpers";

interface PngImageData {
	channels: number;
	data: Buffer;
	height: number;
	width: number;
}

interface PngChunk {
	data: Buffer;
	type: string;
}

function paethPredictor(left: number, above: number, upperLeft: number): number {
	const estimate       = left + above - upperLeft;
	const leftDistance   = Math.abs(estimate - left);
	const aboveDistance  = Math.abs(estimate - above);
	const cornerDistance = Math.abs(estimate - upperLeft);

	if (leftDistance <= aboveDistance && leftDistance <= cornerDistance) {
		return left;
	}
	return aboveDistance <= cornerDistance ? above : upperLeft;
}

function assertPngSignature(buffer: Buffer): void {
	const pngSignature = "89504e470d0a1a0a";
	if (buffer.subarray(
		0,
		8,
	).toString("hex") !== pngSignature) {
		throw new Error("Screenshot was not a PNG image.");
	}
}

function readPngChunks(buffer: Buffer): PngChunk[] {
	const chunks: PngChunk[] = [];
	let chunkOffset          = 8;

	while (chunkOffset < buffer.length) {
		const length = buffer.readUInt32BE(chunkOffset);
		const type   = buffer.subarray(
			chunkOffset + 4,
			chunkOffset + 8,
		).toString("ascii");
		const data   = buffer.subarray(
			chunkOffset + 8,
			chunkOffset + 8 + length,
		);
		chunks.push({
			data,
			type,
		});
		chunkOffset += length + 12;

		if (type === "IEND") {
			break;
		}
	}

	return chunks;
}

function readPngHeader(chunks: PngChunk[]): Pick<PngImageData, "channels" | "height" | "width"> {
	const header = chunks.find(chunk => chunk.type === "IHDR");
	if (!header) {
		throw new Error("Screenshot PNG did not contain an IHDR chunk.");
	}

	const width     = header.data.readUInt32BE(0);
	const height    = header.data.readUInt32BE(4);
	const bitDepth  = header.data.readUInt8(8);
	const colorType = header.data.readUInt8(9);
	if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
		throw new Error(`Unsupported screenshot PNG format: bitDepth=${ bitDepth } colorType=${ colorType }.`);
	}

	return {
		channels: colorType === 6 ? 4 : 3,
		height,
		width,
	};
}

function readFilteredPngByte(filter: number, raw: number, left: number, above: number, upperLeft: number): number {
	switch (filter) {
		case 0:
			return raw;
		case 1:
			return raw + left;
		case 2:
			return raw + above;
		case 3:
			return raw + Math.floor((left + above) / 2);
		case 4:
			return raw + paethPredictor(
				left,
				above,
				upperLeft,
			);
		default:
			throw new Error(`Unsupported screenshot PNG filter: ${ filter }.`);
	}
}

function unfilterPngScanlines(inflated: Buffer, header: Pick<PngImageData, "channels" | "height" | "width">): Buffer {
	const rowBytes   = header.width * header.channels;
	const pixels     = Buffer.alloc(rowBytes * header.height);
	let sourceOffset = 0;

	for (let row = 0; row < header.height; row += 1) {
		const filter            = inflated[ sourceOffset ];
		sourceOffset += 1;
		const currentRowOffset  = row * rowBytes;
		const previousRowOffset = row === 0 ? -1 : (row - 1) * rowBytes;
		for (let x = 0; x < rowBytes; x += 1) {
			const raw                      = inflated[ sourceOffset + x ] ?? 0;
			const left                     = x >= header.channels ? pixels[ currentRowOffset + x - header.channels ] ?? 0 : 0;
			const above                    = previousRowOffset >= 0 ? pixels[ previousRowOffset + x ] ?? 0 : 0;
			const upperLeft                = previousRowOffset >= 0 && x >= header.channels
				? pixels[ previousRowOffset + x - header.channels ] ?? 0
				: 0;
			pixels[ currentRowOffset + x ] = readFilteredPngByte(
				filter ?? 0,
				raw,
				left,
				above,
				upperLeft,
			) & 0xff;
		}
		sourceOffset += rowBytes;
	}

	return pixels;
}

function readPngImageData(buffer: Buffer): PngImageData {
	assertPngSignature(buffer);

	const chunks     = readPngChunks(buffer);
	const header     = readPngHeader(chunks);
	const idatChunks = chunks
		.filter(chunk => chunk.type === "IDAT")
		.map(chunk => chunk.data);
	if (idatChunks.length === 0) {
		throw new Error("Screenshot PNG did not contain image data.");
	}

	const inflated = inflateSync(Buffer.concat(idatChunks));
	const pixels   = unfilterPngScanlines(
		inflated,
		header,
	);

	return {
		channels: header.channels,
		data:     pixels,
		height:   header.height,
		width:    header.width,
	};
}

function countDistinctScreenshotColors(buffer: Buffer, maxDistinctColors = 32): number {
	const image      = readPngImageData(buffer);
	const colors     = new Set<string>();
	const pixelCount = image.width * image.height;
	const stride     = Math.max(
		1,
		Math.floor(pixelCount / 8_000),
	);
	for (let pixel = 0; pixel < pixelCount; pixel += stride) {
		const offset = pixel * image.channels;
		const alpha  = image.channels === 4 ? image.data[ offset + 3 ] ?? 255 : 255;
		if (alpha === 0) {
			continue;
		}
		colors.add([
			image.data[ offset ] ?? 0,
			image.data[ offset + 1 ] ?? 0,
			image.data[ offset + 2 ] ?? 0,
		].join(":"));
		if (colors.size >= maxDistinctColors) {
			return colors.size;
		}
	}
	return colors.size;
}

export function registerTerminalHarnessTests(context: NimlatE2ETestContext): void {
	test(
		"errored content list, retry, hide, and queue invalidation",
		async () => {
			const basePage = context.getBasePage();
			const { ids }  = context.getSnapshot();
			await evaluateRenderer<void>(
				basePage,
				`(() => {
					window.__hydratorQueueChangedCount = 0;
					window.__unsubscribeHydratorQueueChanged = window.electronAPI.hydrator.onQueueChanged(() => {
						window.__hydratorQueueChangedCount += 1;
					});
				})()`,
			);

			const result = await evaluateRenderer<{
				beforeTotal: number;
				missingBefore?: {
					mediaId: number;
					queueStatus: string;
					canRetry: boolean;
					recommendedAction: string;
				};
				transientBefore?: {
					mediaId: number;
					queueStatus: string;
					canRetry: boolean;
					recommendedAction: string;
				};
				retryResult: { success: boolean; error?: string };
				hideResult: { success: boolean; error?: string };
				afterVisibleIds: number[];
				hiddenMissing?: { mediaId: number; isHidden: boolean };
			}>(
				basePage,
				`(async () => {
					const before = await window.electronAPI.hydrator.listErroredContent(0, 20, "jikan-episodes", false);
					const missingBefore = before.items.find((item) => item.mediaId === ${ ids.missingJikanMedia });
					const transientBefore = before.items.find((item) => item.mediaId === ${ ids.transientFailureMedia });
					const retryResult = await window.electronAPI.hydrator.retryErroredContent({
						queue: "jikan-episodes",
						mediaId: ${ ids.transientFailureMedia },
					});
					const hideResult = await window.electronAPI.hydrator.hideErroredContent({
						queue: "jikan-episodes",
						mediaId: ${ ids.missingJikanMedia },
					});
					const afterVisible = await window.electronAPI.hydrator.listErroredContent(0, 20, "jikan-episodes", false);
					const hidden = await window.electronAPI.hydrator.listErroredContent(0, 20, "jikan-episodes", true);
					const hiddenMissing = hidden.items.find((item) => item.mediaId === ${ ids.missingJikanMedia });
					return {
						beforeTotal: before.total,
						missingBefore,
						transientBefore,
						retryResult,
						hideResult,
						afterVisibleIds: afterVisible.items.map((item) => item.mediaId),
						hiddenMissing: hiddenMissing
							? {
								mediaId: hiddenMissing.mediaId,
								isHidden: hiddenMissing.isHidden,
							}
							: undefined,
					};
				})()`,
			);

			expect(result.beforeTotal).toBeGreaterThanOrEqual(2);
			expect(result.missingBefore?.queueStatus).toBe("failed");
			expect(result.missingBefore?.canRetry).toBe(false);
			expect(result.missingBefore?.recommendedAction).toBe("report");
			expect(result.transientBefore?.queueStatus).toBe("failed");
			expect(result.transientBefore?.canRetry).toBe(true);
			expect(result.transientBefore?.recommendedAction).toBe("report");
			expect(
				result.retryResult.success,
				result.retryResult.error,
			).toBe(true);
			expect(
				result.hideResult.success,
				result.hideResult.error,
			).toBe(true);
			expect(result.afterVisibleIds).not.toContain(ids.missingJikanMedia);
			expect(result.hiddenMissing).toEqual({
				mediaId:  ids.missingJikanMedia,
				isHidden: true,
			});
			await waitForRendererCondition(
				basePage,
				"window.__hydratorQueueChangedCount >= 1",
			);
			await evaluateRenderer<void>(
				basePage,
				"window.__unsubscribeHydratorQueueChanged?.()",
			);
		},
	);

	test(
		"mounted library official hide action",
		async () => {
			const electronApp = context.getElectronApp();
			const {
							ids,
							groupIds,
						}           = context.getSnapshot();
			const opened      = await openHarnessPage(
				electronApp,
				"library",
			);
			try {
				await waitForRendererCondition(
					opened.page,
					`(() => {
						const wall = document.querySelector('[data-testid="library-media-wall"]');
						return wall instanceof HTMLElement
							&& Number(wall.getAttribute('data-media-wall-loaded-count') ?? '0') > 0;
					})()`,
				);
				const targetIndex = await evaluateRenderer<number>(
					opened.page,
					`(async () => {
						const targetKey = "group:official:${ groupIds.libraryHideGroupId }";
						const range = await window.electronAPI.groupExplorer.listLibraryItemsRange({
							offset: 0,
							limit: 160,
							search: "",
							scope: "library",
						});
						const targetIndex = range.items.findIndex((item) => item.key === targetKey);
						if (targetIndex < 0) {
							throw new Error("Mounted Library hide target was not present in the first Pixi wall range.");
						}
						return targetIndex;
					})()`,
				);
				await runMediaWallTerminalAction(
					opened.page,
					{
						actionRowIndex: 3,
						confirm:        true,
						targetIndex,
						testId:         "library-media-wall",
					},
				);
				await waitForRendererCondition(
					opened.page,
					`window.electronAPI.groupExplorer.listLibraryItemsRange({
						offset: 0,
						limit: 160,
						search: "",
						scope: "library",
					}).then((range) => !range.items.some((item) => item.key === "group:official:${ groupIds.libraryHideGroupId }"))`,
				);
				await waitForRendererCondition(
					opened.page,
					`window.electronAPI.groupExplorer.listLibraryItemsRange({
						offset: 0,
						limit: 160,
						search: "",
						scope: "library",
					}).then((range) => range.items.some((item) => item.key === "media:${ ids.libraryHideMedia }"))`,
				);
			} finally {
				await runMainCommand(
					electronApp,
					"destroyWindow",
					[ opened.windowId ],
				);
			}
		},
	);

	test(
		"media wall 20k stress harness",
		async () => {
			const electronApp = context.getElectronApp();
			const opened      = await openHarnessPage(
				electronApp,
				"media-wall-stress",
			);
			try {
				await waitForRendererCondition(
					opened.page,
					`(() => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						return wall instanceof HTMLElement
							&& wall.getAttribute('data-media-wall-total') === '20000'
							&& Number(wall.getAttribute('data-media-wall-loaded-count') ?? '0') > 0
							&& Number(wall.getAttribute('data-media-wall-loaded-count') ?? '0') < 500;
					})()`,
				);
				await waitForRendererCondition(
					opened.page,
					`document.querySelector('[data-testid="media-wall-stress-diagnostics"]') !== null`,
				);
				await wait(250);
				const initialRangeRequests = await evaluateRenderer<{ loaded: number; requests: number }>(
					opened.page,
					`(() => ({
						loaded: window.__mediaWallStress?.rangeLoadedCount ?? 0,
						requests: window.__mediaWallStress?.rangeRequests.length ?? 0,
					}))()`,
				);
				expect(initialRangeRequests.loaded).toBeGreaterThanOrEqual(1);
				expect(initialRangeRequests.loaded).toBeLessThanOrEqual(2);
				expect(initialRangeRequests.requests).toBeLessThanOrEqual(3);

				const hasActiveOverlay = await evaluateRenderer<boolean>(
					opened.page,
					`(async () => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						const pixiLayer = wall?.firstElementChild;
						if (!(wall instanceof HTMLElement) || !(pixiLayer instanceof HTMLElement)) {
							throw new Error("Stress media wall layer not found for overlay hover.");
						}
						const bounds = pixiLayer.getBoundingClientRect();
						pixiLayer.dispatchEvent(new PointerEvent("pointermove", {
							bubbles: true,
							clientX: bounds.left + Math.min(80, bounds.width / 2),
							clientY: bounds.top + 80,
						}));
						for (let attempt = 0; attempt < 20; attempt += 1) {
							await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
							if (document.querySelector('[data-testid="media-wall-stress-active"]') instanceof HTMLElement) {
								return true;
							}
						}
						return false;
					})()`,
				);
				if (hasActiveOverlay) {
					await evaluateRenderer<void>(
						opened.page,
						`(() => {
							const wall = document.querySelector('[data-testid="media-wall-stress"]');
							if (!(wall instanceof HTMLElement)) {
								throw new Error("Stress media wall not found for overlay scroll.");
							}
							wall.scrollTo({ top: 1200 });
						})()`,
					);
					await waitForRendererCondition(
						opened.page,
						`document.querySelector('[data-testid="media-wall-stress-active"]') === null`,
					);
				}

				await evaluateRenderer<void>(
					opened.page,
					`(() => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						if (!(wall instanceof HTMLElement)) {
							throw new Error("Stress media wall not found.");
						}
						wall.scrollTo({ top: wall.scrollHeight });
					})()`,
				);
				await waitForRendererCondition(
					opened.page,
					`(() => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						return wall instanceof HTMLElement
							&& Number(wall.getAttribute('data-media-wall-loaded-offset') ?? '0') > 1000
							&& Number(wall.getAttribute('data-media-wall-loaded-count') ?? '0') < 500
							&& Boolean(window.__mediaWallStress?.rangeRequests.some((request) => request.offset > 1000));
					})()`,
				);

				await evaluateRenderer<void>(
					opened.page,
					`(async () => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						if (!(wall instanceof HTMLElement)) {
							throw new Error("Stress media wall not found for wheel simulation.");
						}
						const maxScrollTop = Math.max(0, wall.scrollHeight - wall.clientHeight);
						for (let step = 0; step <= 20; step += 1) {
							wall.scrollTop = maxScrollTop * (step / 20);
							wall.dispatchEvent(new Event("scroll", { bubbles: true }));
							await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
						}
					})()`,
				);
				await waitForRendererCondition(
					opened.page,
					`(() => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						const textureValue = document.querySelector('[data-media-wall-diagnostic="textures"]')?.textContent ?? "";
						const textureCount = Number(textureValue.match(/^(\\d+)/)?.[1] ?? "9999");
						return wall instanceof HTMLElement
							&& Number(wall.getAttribute('data-media-wall-loaded-count') ?? '0') < 500
							&& Number(window.__mediaWallStress?.rangeRequests.length ?? 0) >= 4
							&& textureCount <= 96;
					})()`,
				);

				await runMainCommand(
					electronApp,
					"setWindowSize",
					[
						opened.windowId,
						1280,
						720,
					],
				);
				await waitForRendererCondition(
					opened.page,
					`(() => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						const diagnostics = document.querySelector('[data-testid="media-wall-stress-diagnostics"]');
						return wall instanceof HTMLElement
							&& diagnostics instanceof HTMLElement
							&& wall.clientWidth >= 1000
							&& diagnostics.textContent?.includes('textures');
					})()`,
				);
			} finally {
				await runMainCommand(
					electronApp,
					"destroyWindow",
					[ opened.windowId ],
				);
			}
		},
	);

	test(
		"minimum 800x480 mounted harnesses render usable nonblank surfaces",
		async () => {
			// Xvfb uses software rendering in CI, so capturing the 20k-item stress wall can exceed
			// Playwright's 30-second screenshot default even after the renderer is demonstrably ready.
			test.setTimeout(120_000);
			const electronApp = context.getElectronApp();
			const targets     = [
				{
					kind:             "library" as const,
					testId:           "library-media-wall",
					loadedExpression: `(() => {
						const wall = document.querySelector('[data-testid="library-media-wall"]');
						return wall instanceof HTMLElement
							&& Number(wall.getAttribute('data-media-wall-loaded-count') ?? '0') > 0;
					})()`,
				},
				{
					kind:             "media-wall-stress" as const,
					testId:           "media-wall-stress",
					loadedExpression: `(() => {
						const wall = document.querySelector('[data-testid="media-wall-stress"]');
						return wall instanceof HTMLElement
							&& wall.getAttribute('data-media-wall-total') === '20000'
							&& Number(wall.getAttribute('data-media-wall-loaded-count') ?? '0') > 0;
					})()`,
				},
			];

			for (const target of targets) {
				const opened = await openHarnessPage(
					electronApp,
					target.kind,
					{
						width:  800,
						height: 480,
					},
				);
				try {
					await opened.page.setViewportSize({
						width:  800,
						height: 480,
					});
					await waitForRendererCondition(
						opened.page,
						target.loadedExpression,
					);
					const metrics = await evaluateRenderer<{
						wallHeight: number;
						wallWidth: number;
						windowHeight: number;
						windowWidth: number;
					}>(
						opened.page,
						`(() => {
							const wall = document.querySelector('[data-testid="${ target.testId }"]');
							if (!(wall instanceof HTMLElement)) {
								throw new Error("Minimum viewport wall ${ target.testId } was not found.");
							}
							return {
								wallHeight: wall.clientHeight,
								wallWidth: wall.clientWidth,
								windowHeight: window.innerHeight,
								windowWidth: window.innerWidth,
							};
						})()`,
					);
					expect(metrics.windowWidth).toBe(800);
					expect(metrics.windowHeight).toBe(480);
					expect(metrics.wallWidth).toBeGreaterThanOrEqual(720);
					expect(metrics.wallHeight).toBeGreaterThanOrEqual(320);

					const screenshot = await opened.page.screenshot({
						timeout: 60_000,
					});
					expect(countDistinctScreenshotColors(screenshot)).toBeGreaterThanOrEqual(16);
				} finally {
					await runMainCommand(
						electronApp,
						"destroyWindow",
						[ opened.windowId ],
					);
				}
			}
		},
	);

	test(
		"app sandbox survives the suite",
		async () => {
			const electronApp       = context.getElectronApp();
			const appDataPathExists = await runMainCommand(
				electronApp,
				"appDataPathExists",
			);
			expect(appDataPathExists).toBe(true);
		},
	);
}
