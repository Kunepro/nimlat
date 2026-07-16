import Menu from "antd/es/menu";
import Modal from "antd/es/modal";
import type { FC } from "react";
import baseStyles from "../ModalBase.module.css";
import ModalTitle from "../ModalTitle";
import PreferencesAdultContentConfirmModal from "./components/PreferencesAdultContentConfirmModal";
import PreferencesSectionContent from "./components/PreferencesSectionContent";
import {
	buildPreferenceMenuItems,
	type PreferenceSection,
} from "./preferences-modal-model";
import styles from "./PreferencesModal.module.css";
import { usePreferencesModalController } from "./usePreferencesModalController";

const PreferencesModal: FC = () => {
	const controller = usePreferencesModalController();
	const {
					activeSection,
					closePreferencesModal,
					isAdultConfirmOpen,
					modalState,
					persistAdultContentStatus,
					setActiveSection,
					setAdultConfirmOpen,
				}          = controller;

	return (
		<>
			<Modal
				open={ modalState.isOpen }
				onCancel={ closePreferencesModal }
				footer={ null }
				width="min(92vw, 1120px)"
				centered
				title={ <ModalTitle>Preferences</ModalTitle> }
				className={ `${ baseStyles.modal } ${ styles.modal }` }
				destroyOnClose={ false }
			>
				<div className={ styles.preferencesLayout }>
					<Menu
						mode="inline"
						selectedKeys={ [ activeSection ] }
						onClick={ (event) => setActiveSection(event.key as PreferenceSection) }
						className={ styles.sectionMenu }
						items={ buildPreferenceMenuItems(modalState.isDevModeEnabled) }
					/>
					<div className={ styles.section }>
						<PreferencesSectionContent controller={ controller }/>
					</div>
				</div>
			</Modal>
			<PreferencesAdultContentConfirmModal
				isOpen={ isAdultConfirmOpen }
				onConfirm={ () => {
					persistAdultContentStatus(true);
					setAdultConfirmOpen(false);
				} }
				onCancel={ () => setAdultConfirmOpen(false) }
			/>
		</>
	);
};

export default PreferencesModal;
