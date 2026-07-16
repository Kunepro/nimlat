// @vitest-environment jsdom

import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import {
	createElement,
	type ReactElement,
} from "react";
import { flushSync } from "react-dom";
import type { Root } from "react-dom/client";
import { createRoot } from "react-dom/client";
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { useImageGalleryDraftController } from "./useImageGalleryDraftController";

type UploadRole = Exclude<ImageGalleryRole, "thumbnail">;

interface RenderedHook<T, P extends object> {
	result: { readonly current: T };
	rerender: (props: P) => void;
	unmount: () => void;
}

interface HookProps {
	isActive: boolean;
	target: number | null;
}

interface Deferred<T> {
	promise: Promise<T>;
	resolve: (value: T) => void;
	reject: (reason?: unknown) => void;
}

let cleanupRenderedHooks: Array<() => void> = [];
let loadGalleryTabs: ReturnType<typeof vi.fn<(target: number) => Promise<ImageGalleryTab[]>>>;
let pickImage: ReturnType<typeof vi.fn<() => Promise<{ success: true; imagePath: string } | {
	success: false;
	canceled?: boolean;
	error?: string
}>>>;
let uploadImage: ReturnType<typeof vi.fn<(target: number, role: UploadRole, sourceImagePath: string) => Promise<{
	success: true;
	candidateKey: string
} | { success: false; error: string }>>>;
let deleteImage: ReturnType<typeof vi.fn<(target: number, candidateKey: string) => Promise<{ success: true } | {
	success: false;
	error?: string
}>>>;

function renderHook<T, P extends object>(
	useHook: (props: P) => T,
	initialProps: P,
): RenderedHook<T, P> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(props: P): ReactElement | null {
		currentValue = useHook(props);
		return null;
	}

	const render = (props: P) => {
		flushSync(() => {
			root.render(createElement(
				HookHost,
				props,
			));
		});
	};

	const unmount = () => {
		if (!isMounted) {
			return;
		}
		isMounted = false;
		flushSync(() => {
			root.unmount();
		});
	};

	cleanupRenderedHooks.push(unmount);
	render(initialProps);

	return {
		result:   {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}
				return currentValue;
			},
		},
		rerender: render,
		unmount,
	};
}

function createDeferred<T>(): Deferred<T> {
	let resolveDeferred: (value: T) => void        = () => {};
	let rejectDeferred: (reason?: unknown) => void = () => {};
	const promise                                  = new Promise<T>((
		resolve,
		reject,
	) => {
		resolveDeferred = resolve;
		rejectDeferred  = reject;
	});

	return {
		promise,
		resolve: resolveDeferred,
		reject:  rejectDeferred,
	};
}

async function waitForAssertion(assertion: () => void): Promise<void> {
	const startedAt = Date.now();
	let lastError: unknown;

	while (Date.now() - startedAt < 1000) {
		try {
			assertion();
			return;
		} catch (error) {
			lastError = error;
			await new Promise(resolve => window.setTimeout(
				resolve,
				0,
			));
		}
	}

	throw lastError instanceof Error ? lastError : new Error("Timed out waiting for assertion.");
}

function createGalleryTab(
	role: ImageGalleryRole,
	activeCandidateKey: string | undefined,
): ImageGalleryTab {
	return {
		role,
		title:      role,
		candidates: activeCandidateKey
									? [
				{
					candidateKey: activeCandidateKey,
					label:        activeCandidateKey,
					role,
					sourceKind:   activeCandidateKey.startsWith("upload") ? "user_upload" : "provider",
				},
			]
									: [],
		activeCandidateKey,
	};
}

function isUploadRole(role: ImageGalleryRole): role is UploadRole {
	return role !== "thumbnail";
}

function isSameTarget(
	left: number | null,
	right: number,
): boolean {
	return left === right;
}

function useTestImageGalleryDraftController({
																							isActive,
																							target,
																						}: HookProps) {
	return useImageGalleryDraftController<number, UploadRole>({
		deleteImage,
		errorMessage: "Failed to load gallery.",
		isActive,
		isSameTarget,
		isUploadRole,
		loadGalleryTabs,
		pickImage,
		target,
		targetKey:    target == null ? null : target.toString(),
		uploadImage,
	});
}

describe(
	"useImageGalleryDraftController",
	() => {
		beforeEach(() => {
			loadGalleryTabs = vi.fn();
			pickImage       = vi.fn();
			uploadImage     = vi.fn();
			deleteImage     = vi.fn();
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
		});

		it(
			"loads gallery tabs and snapshots active selections",
			async () => {
				loadGalleryTabs.mockResolvedValueOnce([
					createGalleryTab(
						"portrait",
						"provider:portrait",
					),
					createGalleryTab(
						"banner",
						"provider:banner",
					),
				]);

				const { result } = renderHook(
					useTestImageGalleryDraftController,
					{
						isActive: true,
						target:   10,
					},
				);

				await waitForAssertion(() => {
					expect(result.current.activeSelections).toMatchObject({
						portrait: "provider:portrait",
						banner:   "provider:banner",
					});
				});
				expect(result.current.mergedTabs[ 0 ]?.activeCandidateKey).toBe("provider:portrait");
				expect(loadGalleryTabs).toHaveBeenCalledWith(10);
			},
		);

		it(
			"uploads an image, reloads the gallery, and selects the uploaded candidate locally",
			async () => {
				loadGalleryTabs
					.mockResolvedValueOnce([
						createGalleryTab(
							"portrait",
							"provider:portrait",
						),
					])
					.mockResolvedValueOnce([
						createGalleryTab(
							"portrait",
							"provider:portrait",
						),
					]);
				pickImage.mockResolvedValueOnce({
					success:   true,
					imagePath: "/tmp/upload.png",
				});
				uploadImage.mockResolvedValueOnce({
					success:      true,
					candidateKey: "upload:portrait",
				});

				const { result } = renderHook(
					useTestImageGalleryDraftController,
					{
						isActive: true,
						target:   10,
					},
				);
				await waitForAssertion(() => {
					expect(result.current.activeSelections.portrait).toBe("provider:portrait");
				});

				result.current.uploadImage("portrait");

				await waitForAssertion(() => {
					expect(result.current.activeSelections.portrait).toBe("upload:portrait");
				});
				expect(pickImage).toHaveBeenCalledTimes(1);
				expect(uploadImage).toHaveBeenCalledWith(
					10,
					"portrait",
					"/tmp/upload.png",
				);
				expect(loadGalleryTabs).toHaveBeenCalledTimes(2);
			},
		);

		it(
			"reloads after deleting the selected upload and falls back to the persisted default",
			async () => {
				loadGalleryTabs
					.mockResolvedValueOnce([
						createGalleryTab(
							"portrait",
							"upload:old",
						),
					])
					.mockResolvedValueOnce([
						createGalleryTab(
							"portrait",
							"provider:portrait",
						),
					]);
				deleteImage.mockResolvedValueOnce({ success: true });

				const { result } = renderHook(
					useTestImageGalleryDraftController,
					{
						isActive: true,
						target:   10,
					},
				);
				await waitForAssertion(() => {
					expect(result.current.activeSelections.portrait).toBe("upload:old");
				});

				result.current.deleteCandidate(
					"portrait",
					"upload:old",
				);

				await waitForAssertion(() => {
					expect(result.current.activeSelections.portrait).toBe("provider:portrait");
				});
				expect(deleteImage).toHaveBeenCalledWith(
					10,
					"upload:old",
				);
				expect(loadGalleryTabs).toHaveBeenCalledTimes(2);
			},
		);

		it(
			"invalidates an upload that resolves after the modal closes",
			async () => {
				const deferredPick = createDeferred<{ success: true; imagePath: string }>();
				loadGalleryTabs.mockResolvedValueOnce([
					createGalleryTab(
						"portrait",
						"provider:portrait",
					),
				]);
				pickImage.mockReturnValueOnce(deferredPick.promise);

				const {
								result,
								rerender,
							} = renderHook(
					useTestImageGalleryDraftController,
					{
						isActive: true,
						target:   10,
					},
				);
				await waitForAssertion(() => {
					expect(result.current.activeSelections.portrait).toBe("provider:portrait");
				});

				result.current.uploadImage("portrait");
				await waitForAssertion(() => {
					expect(result.current.uploadingRole).toBe("portrait");
				});

				rerender({
					isActive: false,
					target:   10,
				});
				await waitForAssertion(() => {
					expect(result.current.uploadingRole).toBeNull();
				});
				deferredPick.resolve({
					success:   true,
					imagePath: "/tmp/stale.png",
				});
				await deferredPick.promise;
				await waitForAssertion(() => {
					expect(uploadImage).not.toHaveBeenCalled();
				});
			},
		);
	},
);
