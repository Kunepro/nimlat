import { Modal } from "antd";
import type { FC } from "react";
import baseStyles from "../ModalBase.module.css";
import ModalTitle from "../ModalTitle";
import EditDetailsMetadataForm from "../shared/EditDetailsMetadataForm";
import EditEpisodeModalFooter from "./components/EditEpisodeModalFooter";
import EditEpisodeThumbnailGallerySection from "./components/EditEpisodeThumbnailGallerySection";
import styles from "./EditEpisodeModal.module.css";
import { useEditEpisodeModalController } from "./hooks/useEditEpisodeModalController";

// Modal for editing one episode's local metadata only.
// Integration tracking and playback issues are handled independently from this flow.
const EditEpisodeModal: FC = () => {
	const {
					closeModal,
					form,
					galleryError,
					isBusy,
					isLoadingGallery,
					isOpen,
					isResetting,
					isSaving,
					resetEpisode,
					selectThumbnail,
					submit,
					thumbnailTabs,
					titleInitialValues,
					uploadingRole,
					uploadThumbnail,
				} = useEditEpisodeModalController();

	return (
		<Modal
			open={ isOpen }
			onCancel={ closeModal }
			closable={ !isBusy }
			maskClosable={ !isBusy }
			keyboard={ !isBusy }
			footer={ (
				<EditEpisodeModalFooter
					isBusy={ isBusy }
					isResetting={ isResetting }
					isSaving={ isSaving }
					onCancel={ closeModal }
					onReset={ resetEpisode }
					onSubmit={ submit }
				/>
			) }
			width={ 860 }
			style={ { top: 24 } }
			title={ <ModalTitle>Edit Episode</ModalTitle> }
			className={ `${ baseStyles.modal } ${ styles.modal }` }
			destroyOnClose={ false }
		>
			<div className={ styles.form }>
				<EditDetailsMetadataForm
					form={ form }
					initialValues={ titleInitialValues }
				/>
				<EditEpisodeThumbnailGallerySection
					galleryError={ galleryError }
					isBusy={ isSaving || isResetting }
					isLoadingGallery={ isLoadingGallery }
					thumbnailTabs={ thumbnailTabs }
					uploadingRole={ uploadingRole }
					onSelectThumbnail={ selectThumbnail }
					onUploadThumbnail={ uploadThumbnail }
				/>
			</div>
		</Modal>
	);
};

export default EditEpisodeModal;
