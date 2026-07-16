import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import { Modal } from "antd";
import type { FC } from "react";
import baseStyles from "../../../modals/ModalBase.module.css";
import ModalTitle from "../../../modals/ModalTitle";
import styles from "./AddToGroupModal.module.css";
import AddToGroupCreateRow from "./components/add-to-group/AddToGroupCreateRow";
import AddToGroupSections from "./components/add-to-group/AddToGroupSections";
import { useAddToGroupModalController } from "./hooks/useAddToGroupModalController";

export interface AddToGroupModalProps {
	isOpen: boolean;
	selectedItems: LibraryDisplayItem[];
	onClose: () => void;
	onCompleted: () => void;
}

const AddToGroupModal: FC<AddToGroupModalProps> = ({
																										 isOpen,
																										 selectedItems,
																										 onClose,
																										 onCompleted,
																									 }) => {
	const {
					assignToGroup,
					createGroup,
					createName,
					hasMergeableSelectedGroups,
					isLoadingGroups,
					isSubmitting,
					otherGroups,
					preferredGroups,
					setCreateName,
					summaryText,
				} = useAddToGroupModalController({
		isOpen,
		onClose,
		onCompleted,
		selectedItems,
	});

	return (
		<Modal
			open={ isOpen }
			onCancel={ isSubmitting ? undefined : onClose }
			footer={ null }
			width={ 640 }
			title={ <ModalTitle>Add To</ModalTitle> }
			className={ `${ baseStyles.modal } ${ styles.modal }` }
			destroyOnClose={ false }
		>
			<div className={ styles.layout }>
				<div className={ styles.summary }>
					{ summaryText }
				</div>

				<AddToGroupCreateRow
					createName={ createName }
					isSubmitting={ isSubmitting }
					onCreate={ createGroup }
					onCreateNameChange={ setCreateName }
				/>

				<AddToGroupSections
					hasMergeableSelectedGroups={ hasMergeableSelectedGroups }
					isLoadingGroups={ isLoadingGroups }
					isSubmitting={ isSubmitting }
					otherGroups={ otherGroups }
					preferredGroups={ preferredGroups }
					onAssignToGroup={ assignToGroup }
				/>
			</div>
		</Modal>
	);
};

export default AddToGroupModal;
