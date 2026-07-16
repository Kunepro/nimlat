import { PlusOutlined } from "@ant-design/icons";
import type { DownloadSearchProvider } from "@nimlat/types/download-search";
import { Button } from "antd";
import type { FC } from "react";
import type { DownloadProviderFormState } from "../../../../types/modals";
import styles from "../../PreferencesModal.module.css";
import DownloadProviderForm from "./DownloadProviderForm";
import DownloadProviderItem from "./DownloadProviderItem";

interface DownloadProvidersSettingsProps {
	editDraft: DownloadProviderFormState;
	editingProviderId: string | null;
	isAddingProvider: boolean;
	newProviderDraft: DownloadProviderFormState;
	providers: DownloadSearchProvider[];
	onCancelAdd: () => void;
	onCancelEdit: () => void;
	onCreateProvider: () => void;
	onDeleteProvider: (providerId: string) => void;
	onEditDraftChange: (patch: Partial<DownloadProviderFormState>) => void;
	onNewDraftChange: (patch: Partial<DownloadProviderFormState>) => void;
	onSaveEdit: () => void;
	onStartEdit: (providerId: string) => void;
	onToggleAddForm: () => void;
	onToggleProvider: (providerId: string, enabled: boolean) => void;
}

const DownloadProvidersSettings: FC<DownloadProvidersSettingsProps> = ({
																																				 editDraft,
																																				 editingProviderId,
																																				 isAddingProvider,
																																				 newProviderDraft,
																																				 providers,
																																				 onCancelAdd,
																																				 onCancelEdit,
																																				 onCreateProvider,
																																				 onDeleteProvider,
																																				 onEditDraftChange,
																																				 onNewDraftChange,
																																				 onSaveEdit,
																																				 onStartEdit,
																																				 onToggleAddForm,
																																				 onToggleProvider,
																																			 }) => (
	<>
		<div className={ styles.settingCopy }>
			<div className={ styles.settingLabel }>Search providers</div>
		</div>
		<div className={ styles.providerGrid }>
			{ providers.map((provider) => (
				<DownloadProviderItem
					key={ provider.id }
					provider={ provider }
					isEditing={ editingProviderId === provider.id }
					editDraft={ editDraft }
					onCancelEdit={ onCancelEdit }
					onDelete={ onDeleteProvider }
					onEditDraftChange={ onEditDraftChange }
					onSaveEdit={ onSaveEdit }
					onStartEdit={ onStartEdit }
					onToggle={ onToggleProvider }
				/>
			)) }
		</div>
		<Button
			icon={ <PlusOutlined/> }
			onClick={ onToggleAddForm }
		>
			Add new provider
		</Button>
		{ isAddingProvider ? (
			<DownloadProviderForm
				draft={ newProviderDraft }
				onCancel={ onCancelAdd }
				onChange={ onNewDraftChange }
				onSave={ onCreateProvider }
			/>
		) : null }
	</>
);

export default DownloadProvidersSettings;
