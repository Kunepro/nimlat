// @vitest-environment jsdom
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
import type { PlaybackIssueFormValues } from "../playback-issue-editor-model";
import {
	type PlaybackIssueEditorFormApi,
	usePlaybackIssueEditorAutosave,
} from "./usePlaybackIssueEditorAutosave";

interface RenderedHook<T> {
	result: { readonly current: T };
	rerender: () => void;
	unmount: () => void;
}

let cleanupRenderedHooks: Array<() => void> = [];

function renderHook<T>(useHook: () => T): RenderedHook<T> {
	const container  = document.createElement("div");
	const root: Root = createRoot(container);
	let currentValue: T | undefined;
	let isMounted    = true;

	function HookHost(): ReactElement | null {
		currentValue = useHook();
		return null;
	}

	flushSync(() => {
		root.render(createElement(HookHost));
	});

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

	return {
		result: {
			get current() {
				if (currentValue === undefined) {
					throw new Error("Hook rendered without producing a value.");
				}
				return currentValue;
			},
		},
		rerender: () => {
			flushSync(() => {
				root.render(createElement(HookHost));
			});
		},
		unmount,
	};
}

function createFormApi(values: PlaybackIssueFormValues): PlaybackIssueEditorFormApi {
	return {
		setFieldsValue: vi.fn(),
		validateFields: vi.fn(() => Promise.resolve(values)),
	} as unknown as PlaybackIssueEditorFormApi;
}

function createDeferred<T>() {
	let resolve: ((value: T) => void) | null = null;
	const promise                            = new Promise<T>((deferredResolve) => {
		resolve = deferredResolve;
	});

	return {
		promise,
		resolve: (value: T) => {
			if (!resolve) {
				throw new Error("Deferred promise was not initialized.");
			}
			resolve(value);
		},
	};
}

async function advanceTimers(ms: number): Promise<void> {
	await vi.advanceTimersByTimeAsync(ms);
	await Promise.resolve();
	await Promise.resolve();
}

describe(
	"usePlaybackIssueEditorAutosave",
	() => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			cleanupRenderedHooks.forEach(cleanupHook => cleanupHook());
			cleanupRenderedHooks = [];
			vi.useRealTimers();
		});

		it(
			"hydrates the form only when opened",
			async () => {
				const initialValues: PlaybackIssueFormValues = {
					playbackIssueNote: "artifact",
					hasVideoIssue:     true,
				};
				const form                                   = createFormApi(initialValues);
				const { result }                             = renderHook(() => usePlaybackIssueEditorAutosave({
					currentIntegrationStatus: null,
					form,
					initialValues,
					onSave:                   vi.fn(),
				}));

				flushSync(() => {
					result.current.setIsOpen(true);
				});
				await advanceTimers(0);

				expect(form.setFieldsValue).toHaveBeenCalledWith(initialValues);

				flushSync(() => {
					result.current.setIsOpen(false);
				});
				await advanceTimers(0);

				expect(form.setFieldsValue).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"does not overwrite active edits when DB-backed initial values refresh",
			async () => {
				let initialValues: PlaybackIssueFormValues = {
					playbackIssueNote: "saved snapshot",
				};
				const form                              = createFormApi(initialValues);
				const { result, rerender }              = renderHook(() => usePlaybackIssueEditorAutosave({
					currentIntegrationStatus: null,
					form,
					initialValues,
					onSave:                   vi.fn(),
				}));

				flushSync(() => {
					result.current.setIsOpen(true);
				});
				await advanceTimers(0);
				expect(form.setFieldsValue).toHaveBeenCalledTimes(1);

				initialValues = { playbackIssueNote: "new IPC snapshot" };
				rerender();
				await advanceTimers(0);

				expect(form.setFieldsValue).toHaveBeenCalledTimes(1);

				flushSync(() => {
					result.current.setIsOpen(false);
				});
				flushSync(() => {
					result.current.setIsOpen(true);
				});
				await advanceTimers(0);

				expect(form.setFieldsValue).toHaveBeenLastCalledWith(initialValues);
			},
		);

		it(
			"debounces form persistence and builds the playback issue payload",
			async () => {
				const form       = createFormApi({
					playbackIssueNote:    "artifact",
					hasVideoIssue:        true,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "video",
							timestampText:         "1:20",
							note:                  "blocking frame",
						},
					],
				});
				const onSave     = vi.fn(() => Promise.resolve());
				const { result } = renderHook(() => usePlaybackIssueEditorAutosave({
					currentIntegrationStatus: null,
					form,
					initialValues:            {},
					onSave,
				}));

				flushSync(() => {
					result.current.schedulePersist({ hasVideoIssue: true });
				});
				await advanceTimers(249);
				expect(onSave).not.toHaveBeenCalled();

				await advanceTimers(1);

				expect(onSave).toHaveBeenCalledWith({
					integrationStatus:    "downloaded",
					playbackIssueNote:    "artifact",
					hasDubIssue:          undefined,
					hasSubIssue:          undefined,
					hasEncodingIssue:     undefined,
					hasAudioIssue:        undefined,
					hasVideoIssue:        true,
					playbackIssueMoments: [
						{
							playbackIssueCategory: "video",
							timeSeconds:           80,
							note:                  "blocking frame",
						},
					],
				});
			},
		);

		it(
			"queues a second persist when values change while a save is still running",
			async () => {
				const firstSave  = createDeferred<void>();
				const form       = createFormApi({ hasAudioIssue: true });
				const onSave     = vi.fn()
					.mockReturnValueOnce(firstSave.promise)
					.mockResolvedValueOnce(undefined);
				const { result } = renderHook(() => usePlaybackIssueEditorAutosave({
					currentIntegrationStatus: "downloaded",
					form,
					initialValues:            {},
					onSave,
				}));

				flushSync(() => {
					result.current.schedulePersist({ hasAudioIssue: true });
				});
				await advanceTimers(250);
				expect(onSave).toHaveBeenCalledTimes(1);

				flushSync(() => {
					result.current.schedulePersist({ hasAudioIssue: false });
				});
				await advanceTimers(250);
				expect(onSave).toHaveBeenCalledTimes(1);

				firstSave.resolve();
				await firstSave.promise;
				await Promise.resolve();
				await Promise.resolve();

				expect(onSave).toHaveBeenCalledTimes(2);
			},
		);

		it(
			"keeps note typing local until the field is committed",
			async () => {
				const form       = createFormApi({ playbackIssueNote: "fluid typing" });
				const onSave     = vi.fn(() => Promise.resolve());
				const { result } = renderHook(() => usePlaybackIssueEditorAutosave({
					currentIntegrationStatus: null,
					form,
					initialValues:            {},
					onSave,
				}));

				flushSync(() => {
					result.current.schedulePersist({ playbackIssueNote: "f" });
					result.current.schedulePersist({ playbackIssueNote: "fluid typing" });
				});
				await advanceTimers(2_000);
				expect(onSave).not.toHaveBeenCalled();

				flushSync(() => {
					result.current.commitPendingChanges();
				});
				await advanceTimers(0);

				expect(onSave).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"commits a dirty note when the popover closes",
			async () => {
				const form       = createFormApi({ playbackIssueNote: "save on close" });
				const onSave     = vi.fn(() => Promise.resolve());
				const { result } = renderHook(() => usePlaybackIssueEditorAutosave({
					currentIntegrationStatus: null,
					form,
					initialValues:            {},
					onSave,
				}));

				flushSync(() => {
					result.current.setIsOpen(true);
				});
				await advanceTimers(0);
				flushSync(() => {
					result.current.schedulePersist({ playbackIssueNote: "save on close" });
					result.current.setIsOpen(false);
				});
				await advanceTimers(0);

				expect(onSave).toHaveBeenCalledTimes(1);
			},
		);

		it(
			"drops invalid intermediate form states without calling save",
			async () => {
				const form = createFormApi({});
				vi.mocked(form.validateFields).mockRejectedValueOnce(new Error("invalid timestamp"));
				const onSave     = vi.fn(() => Promise.resolve());
				const { result } = renderHook(() => usePlaybackIssueEditorAutosave({
					currentIntegrationStatus: null,
					form,
					initialValues:            {},
					onSave,
				}));

				flushSync(() => {
					result.current.schedulePersist({ hasVideoIssue: true });
				});
				await advanceTimers(250);

				expect(onSave).not.toHaveBeenCalled();
				expect(result.current.isSaving).toBe(false);
			},
		);
	},
);
