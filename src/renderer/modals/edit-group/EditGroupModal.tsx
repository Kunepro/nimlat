import { Modal } from "antd";
import type { FC } from "react";
import baseStyles from "../ModalBase.module.css";
import ModalTitle from "../ModalTitle";
import EditDetailsMetadataForm from "../shared/EditDetailsMetadataForm";
import EditImageGallerySection from "../shared/EditImageGallerySection";
import EditGroupModalFooter from "./components/EditGroupModalFooter";
import styles from "./EditGroupModal.module.css";
import { useEditGroupModalController } from "./hooks/useEditGroupModalController";

// Modal for editing user-managed Group metadata.
// File picking stays in main via IPC; renderer only manages transient form state and preview.
const EditGroupModal: FC = () => {
	const {
					closeModal,
					form,
					galleryError,
					isBusy,
					isLoadingGallery,
					isOpen,
					isSaving,
					mergedTabs,
					selectCandidate,
					submit,
					titleInitialValues,
					uploadImage,
					uploadingRole,
				} = useEditGroupModalController();

	return (
		<Modal
			open={ isOpen }
			onCancel={ closeModal }
			closable={ !isBusy }
			maskClosable={ !isBusy }
			keyboard={ !isBusy }
			footer={ (
				<EditGroupModalFooter
					isBusy={ isBusy }
					isSaving={ isSaving }
					onCancel={ closeModal }
					onSubmit={ submit }
				/>
			) }
			width={ 760 }
			style={ { top: 24 } }
			title={ <ModalTitle>Edit Group</ModalTitle> }
			className={ `${ baseStyles.modal } ${ styles.modal }` }
			destroyOnClose={ false }
		>
			<div className={ styles.form }>
				<EditDetailsMetadataForm
					form={ form }
					initialValues={ titleInitialValues }
					requiredMessage="Please enter a group title."
				/>
				<EditImageGallerySection
					galleryError={ galleryError }
					isBusy={ isBusy }
					isLoadingGallery={ isLoadingGallery }
					tabs={ mergedTabs }
					uploadingRole={ uploadingRole }
					onSelectCandidate={ selectCandidate }
					onUpload={ uploadImage }
				/>
			</div>
		</Modal>
	);
};

export default EditGroupModal;
