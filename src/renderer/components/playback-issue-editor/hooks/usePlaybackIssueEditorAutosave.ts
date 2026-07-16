import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { FormInstance } from "antd";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	buildPlaybackIssueSavePayload,
	type PlaybackIssueFormValues,
	type PlaybackIssueSavePayload,
} from "../playback-issue-editor-model";

export type PlaybackIssueEditorFormApi = Pick<
	FormInstance<PlaybackIssueFormValues>,
	"setFieldsValue" | "validateFields"
>;

interface UsePlaybackIssueEditorAutosaveInput {
	currentIntegrationStatus: IntegrationStatus | null;
	form: PlaybackIssueEditorFormApi;
	initialValues: PlaybackIssueFormValues;
	onSave: (payload: PlaybackIssueSavePayload) => Promise<void>;
}

interface PlaybackIssueEditorAutosaveController {
	isOpen: boolean;
	isSaving: boolean;
	commitPendingChanges: () => void;
	schedulePersist: (changedValues: Partial<PlaybackIssueFormValues>) => void;
	setIsOpen: (open: boolean) => void;
}

// Owns the debounce and re-entrant save policy for the compact playback issue
// popover. Invalid intermediate form states are intentionally dropped because
// Ant validation will run again after the next valid change.
export function usePlaybackIssueEditorAutosave({
																								 currentIntegrationStatus,
																								 form,
																								 initialValues,
																								 onSave,
																							 }: UsePlaybackIssueEditorAutosaveInput): PlaybackIssueEditorAutosaveController {
	const [ isOpen, setIsOpen ]     = useState(false);
	const [ isSaving, setIsSaving ] = useState(false);
	const isHydratingFormRef        = useRef(false);
	const isSavingRef               = useRef(false);
	const isDirtyRef                = useRef(false);
	const shouldPersistAgainRef     = useRef(false);
	const saveTimeoutRef            = useRef<number | null>(null);
	const initialValuesRef          = useRef(initialValues);

	// Incoming DB-backed props may change after an autosave completes. Keep the
	// latest snapshot for the next open without overwriting an active user edit.
	initialValuesRef.current = initialValues;

	const clearPendingSave = useCallback(
		() => {
			if (saveTimeoutRef.current != null) {
				window.clearTimeout(saveTimeoutRef.current);
				saveTimeoutRef.current = null;
			}
		},
		[],
	);

	const persistCurrentValues = useCallback(
		async () => {
			if (isSavingRef.current) {
				shouldPersistAgainRef.current = isDirtyRef.current;
				return;
			}
			if (!isDirtyRef.current) {
				return;
			}

			isSavingRef.current = true;
			isDirtyRef.current  = false;
			try {
				const values = await form.validateFields();
				setIsSaving(true);
				await onSave(buildPlaybackIssueSavePayload(
					values,
					currentIntegrationStatus,
				));
			} catch {
				// Invalid intermediate form states, such as a partially typed timestamp, should not save.
				isDirtyRef.current = true;
			} finally {
				isSavingRef.current = false;
				setIsSaving(false);
				if (shouldPersistAgainRef.current) {
					shouldPersistAgainRef.current = false;
					void persistCurrentValues();
				}
			}
		},
		[
			currentIntegrationStatus,
			form,
			onSave,
		],
	);

	const commitPendingChanges = useCallback(
		() => {
			clearPendingSave();
			void persistCurrentValues();
		},
		[
			clearPendingSave,
			persistCurrentValues,
		],
	);

	const schedulePersist = useCallback(
		(changedValues: Partial<PlaybackIssueFormValues>) => {
			if (isHydratingFormRef.current) {
				return;
			}

			isDirtyRef.current = true;
			clearPendingSave();
			if ("playbackIssueNote" in changedValues) {
				// Text input stays renderer-local while focused. Persisting it on every
				// pause would trigger the full DB integration cascade mid-keystroke.
				return;
			}
			saveTimeoutRef.current = window.setTimeout(
				() => {
					void persistCurrentValues();
				},
				250,
			);
		},
		[
			clearPendingSave,
			persistCurrentValues,
		],
	);

	useEffect(
		() => {
			if (!isOpen) {
				isHydratingFormRef.current = false;
				clearPendingSave();
				return;
			}

			isHydratingFormRef.current = true;
			form.setFieldsValue(initialValuesRef.current);
			const hydrationTimeout = window.setTimeout(
				() => {
					isHydratingFormRef.current = false;
				},
				0,
			);

			return () => {
				window.clearTimeout(hydrationTimeout);
				isHydratingFormRef.current = false;
			};
		},
		[
			clearPendingSave,
			form,
			isOpen,
		],
	);

	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				commitPendingChanges();
			}
			setIsOpen(open);
		},
		[ commitPendingChanges ],
	);

	useEffect(
		() => clearPendingSave,
		[ clearPendingSave ],
	);

	return {
		isOpen,
		isSaving,
		commitPendingChanges,
		schedulePersist,
		setIsOpen: handleOpenChange,
	};
}
