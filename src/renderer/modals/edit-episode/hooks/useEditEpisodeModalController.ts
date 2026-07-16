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
	resetEpisodeEdit,
	saveEpisodeEditDraft,
} from "../edit-episode-modal-runner";
import type { EditEpisodeFormValues } from "../edit-episode-modal-types";
import {
	useCloseEditEpisodeModal,
	useEditEpisodeModalState,
} from "../edit-episode-modal.state";
import { useEditEpisodeImageGalleryController } from "./useEditEpisodeImageGalleryController";

interface EpisodeIdentity {
	episodeNumber: number;
	mediaId: number;
}

interface UseEditEpisodeModalControllerResult {
	episodeNumber: number | null;
	form: FormInstance<EditEpisodeFormValues>;
	galleryError: string | null;
	isBusy: boolean;
	isLoadingGallery: boolean;
	isOpen: boolean;
	isResetting: boolean;
	isSaving: boolean;
	thumbnailTabs: ReturnType<typeof useEditEpisodeImageGalleryController>["thumbnailTabs"];
	titleInitialValues: EditEpisodeFormValues;
	uploadingRole: ReturnType<typeof useEditEpisodeImageGalleryController>["uploadingRole"];
	closeModal: () => void;
	resetEpisode: () => void;
	selectThumbnail: ReturnType<typeof useEditEpisodeImageGalleryController>["selectThumbnail"];
	submit: () => void;
	uploadThumbnail: ReturnType<typeof useEditEpisodeImageGalleryController>["uploadThumbnail"];
}

function isSameEpisodeIdentity(
	left: EpisodeIdentity | null,
	right: EpisodeIdentity,
): boolean {
	return left?.mediaId === right.mediaId && left.episodeNumber === right.episodeNumber;
}

export function useEditEpisodeModalController(): UseEditEpisodeModalControllerResult {
	const [ modalState ]     = useEditEpisodeModalState();
	const closeModal         = useCloseEditEpisodeModal();
	const [ form ]           = Form.useForm<EditEpisodeFormValues>();
	const gallery            = useEditEpisodeImageGalleryController({
		episodeNumber: modalState.episodeNumber,
		isOpen:        modalState.isOpen,
		mediaId:       modalState.mediaId,
	});
	const episodeIdentity    = useMemo<EpisodeIdentity | null>(
		() => modalState.mediaId != null && modalState.episodeNumber != null
			? {
				episodeNumber: modalState.episodeNumber,
				mediaId:       modalState.mediaId,
			}
			: null,
		[
			modalState.episodeNumber,
			modalState.mediaId,
		],
	);
	const titleInitialValues = useMemo(
		() => ({
			description: modalState.initialDescription,
			name:        modalState.initialName,
		}),
		[
			modalState.initialDescription,
			modalState.initialName,
		],
	);
	const {
					isMountedRef,
					isStillEditingTarget: isStillEditingEpisode,
				}                  = useEditModalTargetGuard({
		isActive:     modalState.isOpen,
		isSameTarget: isSameEpisodeIdentity,
		target:       episodeIdentity,
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

	const isBusy = isSaving || isResetting || gallery.isLoadingGallery;

	const submit = useCallback(
		() => {
			if (!episodeIdentity) {
				return;
			}

			const identity = episodeIdentity;
			void (async () => {
				const values = await form.validateFields();
				runSaveAction(async () => {
					const result = await saveEpisodeEditDraft(
						identity,
						values,
						gallery.activeSelections,
					);
					if (result.success && isStillEditingEpisode(identity)) {
						closeModal();
					}
				});
			})();
		},
		[
			closeModal,
			episodeIdentity,
			form,
			gallery.activeSelections,
			isStillEditingEpisode,
			runSaveAction,
		],
	);

	// Remove the local episode metadata override so the current AnimeDB episode details become visible again.
	const resetEpisode = useCallback(
		() => {
			if (!episodeIdentity) {
				return;
			}

			const identity = episodeIdentity;
			runResetAction(async () => {
				const result = await resetEpisodeEdit(identity);
				if (result.success && isStillEditingEpisode(identity)) {
					closeModal();
				}
			});
		},
		[
			closeModal,
			episodeIdentity,
			isStillEditingEpisode,
			runResetAction,
		],
	);

	return {
		closeModal,
		episodeNumber:    modalState.episodeNumber,
		form,
		galleryError:     gallery.galleryError,
		isBusy,
		isLoadingGallery: gallery.isLoadingGallery,
		isOpen:           modalState.isOpen,
		isResetting,
		isSaving,
		resetEpisode,
		selectThumbnail:  gallery.selectThumbnail,
		submit,
		thumbnailTabs:    gallery.thumbnailTabs,
		titleInitialValues,
		uploadingRole:    gallery.uploadingRole,
		uploadThumbnail:  gallery.uploadThumbnail,
	};
}
