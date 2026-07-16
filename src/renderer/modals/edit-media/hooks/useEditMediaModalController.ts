import type { FormInstance } from "antd";
import { Form } from "antd";
import {
	useCallback,
	useMemo,
} from "react";
import { useEditModalAsyncAction } from "../../shared/hooks/useEditModalAsyncAction";
import { useEditModalFormReset } from "../../shared/hooks/useEditModalFormReset";
import { useEditModalTargetGuard } from "../../shared/hooks/useEditModalTargetGuard";
import {
	resetMediaEdit,
	saveMediaEditDraft,
} from "../edit-media-modal-runner";
import type { EditMediaFormValues } from "../edit-media-modal-types";
import {
	useCloseEditMediaModal,
	useEditMediaModalState,
} from "../edit-media-modal.state";
import { useEditMediaImageGalleryController } from "./useEditMediaImageGalleryController";

interface UseEditMediaModalControllerResult {
	form: FormInstance<EditMediaFormValues>;
	galleryError: string | null;
	isBusy: boolean;
	isLoadingGallery: boolean;
	isOpen: boolean;
	isResetting: boolean;
	isSaving: boolean;
	mergedTabs: ReturnType<typeof useEditMediaImageGalleryController>["mergedTabs"];
	titleInitialValues: EditMediaFormValues;
	uploadingRole: ReturnType<typeof useEditMediaImageGalleryController>["uploadingRole"];
	closeModal: () => void;
	deleteCandidate: ReturnType<typeof useEditMediaImageGalleryController>["deleteCandidate"];
	resetMedia: () => void;
	selectCandidate: ReturnType<typeof useEditMediaImageGalleryController>["selectCandidate"];
	submit: () => void;
	uploadImage: ReturnType<typeof useEditMediaImageGalleryController>["uploadImage"];
}

export function useEditMediaModalController(): UseEditMediaModalControllerResult {
	const [ modalState ]     = useEditMediaModalState();
	const closeModal         = useCloseEditMediaModal();
	const [ form ]           = Form.useForm<EditMediaFormValues>();
	const gallery            = useEditMediaImageGalleryController({
		isOpen:  modalState.isOpen,
		mediaId: modalState.mediaId,
	});
	const titleInitialValues = useMemo(
		() => ({
			name:        modalState.initialName,
			description: modalState.initialDescription,
		}),
		[
			modalState.initialDescription,
			modalState.initialName,
		],
	);
	const {
					isMountedRef,
					isStillEditingTarget: isStillEditingMedia,
				}                  = useEditModalTargetGuard({
		isActive:     modalState.isOpen,
		isSameTarget: (left, right) => left === right,
		target:       modalState.mediaId,
	});
	const {
					isRunning: isSaving,
					runAction: runSaveAction,
				}                  = useEditModalAsyncAction(isMountedRef);
	const {
					isRunning: isResetting,
					runAction: runResetAction,
				}                  = useEditModalAsyncAction(isMountedRef);
	useEditModalFormReset({
		form,
		initialValues: titleInitialValues,
		isOpen:        modalState.isOpen,
	});

	const isBusy = isSaving || isResetting || gallery.isDeletingImage || gallery.isLoadingGallery;

	const submit = useCallback(
		() => {
			if (modalState.mediaId == null) {
				return;
			}

			const mediaId = modalState.mediaId;
			void (async () => {
				const values = await form.validateFields();
				runSaveAction(async () => {
					const result = await saveMediaEditDraft(
						mediaId,
						values,
						gallery.activeSelections,
					);
					if (result.success && isStillEditingMedia(mediaId)) {
						closeModal();
					}
				});
			})();
		},
		[
			closeModal,
			form,
			gallery.activeSelections,
			isStillEditingMedia,
			modalState.mediaId,
			runSaveAction,
		],
	);

	// Remove the local media metadata override so the current AnimeDB version becomes visible again.
	const resetMedia = useCallback(
		() => {
			if (modalState.mediaId == null) {
				return;
			}

			const mediaId = modalState.mediaId;
			runResetAction(async () => {
				const result = await resetMediaEdit(mediaId);
				if (result.success && isStillEditingMedia(mediaId)) {
					closeModal();
				}
			});
		},
		[
			closeModal,
			isStillEditingMedia,
			modalState.mediaId,
			runResetAction,
		],
	);

	return {
		closeModal,
		deleteCandidate:  gallery.deleteCandidate,
		form,
		galleryError:     gallery.galleryError,
		isBusy,
		isLoadingGallery: gallery.isLoadingGallery,
		isOpen:           modalState.isOpen,
		isResetting,
		isSaving,
		mergedTabs:       gallery.mergedTabs,
		resetMedia,
		selectCandidate:  gallery.selectCandidate,
		submit,
		titleInitialValues,
		uploadImage:      gallery.uploadImage,
		uploadingRole:    gallery.uploadingRole,
	};
}
