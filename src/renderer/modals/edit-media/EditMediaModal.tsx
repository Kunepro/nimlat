import { Modal } from "antd";
import type { FC } from "react";
import styles from "../edit-group/EditGroupModal.module.css";
import baseStyles from "../ModalBase.module.css";
import ModalTitle from "../ModalTitle";
import EditDetailsMetadataForm from "../shared/EditDetailsMetadataForm";
import EditImageGallerySection from "../shared/EditImageGallerySection";
import EditMediaModalFooter from "./components/EditMediaModalFooter";
import { useEditMediaModalController } from "./hooks/useEditMediaModalController";

// Modal for editing user-managed media metadata only.
// Integration tracking and playback issues are handled independently from this flow.
const EditMediaModal: FC = () => {
	const {
					closeModal,
					deleteCandidate,
					form,
					galleryError,
					isBusy,
					isLoadingGallery,
					isOpen,
					isResetting,
					isSaving,
					mergedTabs,
					resetMedia,
					selectCandidate,
					submit,
					titleInitialValues,
					uploadImage,
					uploadingRole,
				} = useEditMediaModalController();

	return (
		<Modal
			open={ isOpen }
			onCancel={ closeModal }
			closable={ !isBusy }
			maskClosable={ !isBusy }
			keyboard={ !isBusy }
			footer={ (
				<EditMediaModalFooter
					isBusy={ isBusy }
					isResetting={ isResetting }
					isSaving={ isSaving }
					onCancel={ closeModal }
					onReset={ resetMedia }
					onSubmit={ submit }
				/>
			) }
			width={ 760 }
			style={ { top: 24 } }
			title={ <ModalTitle>Edit Media</ModalTitle> }
			className={ `${ baseStyles.modal } ${ styles.modal }` }
			destroyOnClose={ false }
		>
			<div className={ styles.form }>
				<EditDetailsMetadataForm
					form={ form }
					initialValues={ titleInitialValues }
					requiredMessage="Please enter a media title."
				/>
				<EditImageGallerySection
					galleryError={ galleryError }
					isBusy={ isBusy }
					isLoadingGallery={ isLoadingGallery }
					tabs={ mergedTabs }
					uploadingRole={ uploadingRole }
					onDeleteCandidate={ deleteCandidate }
					onSelectCandidate={ selectCandidate }
					onUpload={ uploadImage }
				/>
			</div>
		</Modal>
	);
};

export default EditMediaModal;
