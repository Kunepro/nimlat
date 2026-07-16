import Modal from "antd/es/modal";
import type { FC } from "react";
import baseStyles from "../../ModalBase.module.css";
import styles from "../PreferencesModal.module.css";

interface PreferencesAdultContentConfirmModalProps {
	isOpen: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}

const PreferencesAdultContentConfirmModal: FC<PreferencesAdultContentConfirmModalProps> = ({
																																														 isOpen,
																																														 onCancel,
																																														 onConfirm,
																																													 }) => (
	<Modal
		open={ isOpen }
		title="Enable adult-marked content?"
		okText="Enable"
		cancelText="Cancel"
		onOk={ onConfirm }
		onCancel={ onCancel }
		centered
		className={ `${ baseStyles.modal } ${ styles.confirmModal }` }
	>
		<p className={ styles.confirmCopy }>
			This will include entries marked as adult. Titles, descriptions, and images may contain explicit
			or mature content.
		</p>
	</Modal>
);

export default PreferencesAdultContentConfirmModal;
