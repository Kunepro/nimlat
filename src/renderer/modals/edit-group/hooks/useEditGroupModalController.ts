import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { FormInstance } from "antd";
import { Form } from "antd";
import {
	useCallback,
	useMemo,
} from "react";
import { useEditModalAsyncAction } from "../../shared/hooks/useEditModalAsyncAction";
import { useEditModalFormReset } from "../../shared/hooks/useEditModalFormReset";
import { useEditModalTargetGuard } from "../../shared/hooks/useEditModalTargetGuard";
import { saveGroupEditDraft } from "../edit-group-modal-runner";
import type { EditGroupFormValues } from "../edit-group-modal-types";
import {
	useCloseEditGroupModal,
	useEditGroupModalState,
} from "../edit-group-modal.state";
import { useEditGroupImageGalleryController } from "./useEditGroupImageGalleryController";

interface UseEditGroupModalControllerResult {
	form: FormInstance<EditGroupFormValues>;
	galleryError: string | null;
	isBusy: boolean;
	isLoadingGallery: boolean;
	isOpen: boolean;
	isSaving: boolean;
	mergedTabs: ReturnType<typeof useEditGroupImageGalleryController>["mergedTabs"];
	titleInitialValues: EditGroupFormValues;
	uploadingRole: ReturnType<typeof useEditGroupImageGalleryController>["uploadingRole"];
	closeModal: () => void;
	selectCandidate: ReturnType<typeof useEditGroupImageGalleryController>["selectCandidate"];
	submit: () => void;
	uploadImage: ReturnType<typeof useEditGroupImageGalleryController>["uploadImage"];
}

function isSameGroupRef(
	left: GroupRef | null,
	right: GroupRef,
): boolean {
	return left?.source === right.source && left.groupId === right.groupId;
}

export function useEditGroupModalController(): UseEditGroupModalControllerResult {
	const [ modalState ]     = useEditGroupModalState();
	const closeModal         = useCloseEditGroupModal();
	const [ form ]           = Form.useForm<EditGroupFormValues>();
	const gallery            = useEditGroupImageGalleryController({
		group:  modalState.group,
		isOpen: modalState.isOpen,
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
					isStillEditingTarget: isStillEditingGroup,
				}                  = useEditModalTargetGuard({
		isActive:     modalState.isOpen,
		isSameTarget: isSameGroupRef,
		target:       modalState.group,
	});
	const {
					isRunning: isSaving,
					runAction: runSaveAction,
				}                  = useEditModalAsyncAction(isMountedRef);
	useEditModalFormReset({
		form,
		initialValues: titleInitialValues,
		isOpen:        modalState.isOpen,
	});

	const isBusy = isSaving || gallery.isLoadingGallery;

	const submit = useCallback(
		() => {
			const group = modalState.group;
			void (async () => {
				const values = await form.validateFields();
				runSaveAction(async () => {
					const result = await saveGroupEditDraft(
						group,
						values,
						gallery.activeSelections,
					);
					if (result.success && isStillEditingGroup(group)) {
						closeModal();
					}
				});
			})();
		},
		[
			closeModal,
			form,
			gallery.activeSelections,
			isStillEditingGroup,
			modalState.group,
			runSaveAction,
		],
	);

	return {
		closeModal,
		form,
		galleryError:     gallery.galleryError,
		isBusy,
		isLoadingGallery: gallery.isLoadingGallery,
		isOpen:           modalState.isOpen,
		isSaving,
		mergedTabs:       gallery.mergedTabs,
		selectCandidate:  gallery.selectCandidate,
		submit,
		titleInitialValues,
		uploadImage:      gallery.uploadImage,
		uploadingRole:    gallery.uploadingRole,
	};
}
