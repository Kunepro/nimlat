import {
	DeleteOutlined,
	EditOutlined,
} from "@ant-design/icons";
import { CircuitToggle } from "@nimlat/components";
import type { DownloadSearchProvider } from "@nimlat/types/download-search";
import {
	Button,
	Popconfirm,
} from "antd";
import {
	type FC,
	memo,
} from "react";
import type { DownloadProviderFormState } from "../../../../types/modals";
import styles from "../../PreferencesModal.module.css";
import DownloadProviderForm from "./DownloadProviderForm";

interface DownloadProviderItemProps {
	editDraft: DownloadProviderFormState;
	isEditing: boolean;
	provider: DownloadSearchProvider;
	onCancelEdit: () => void;
	onDelete: (providerId: string) => void;
	onEditDraftChange: (patch: Partial<DownloadProviderFormState>) => void;
	onSaveEdit: () => void;
	onStartEdit: (providerId: string) => void;
	onToggle: (providerId: string, enabled: boolean) => void;
}

const DownloadProviderItemComponent: FC<DownloadProviderItemProps> = ({
																																				editDraft,
																																				isEditing,
																																				provider,
																																				onCancelEdit,
																																				onDelete,
																																				onEditDraftChange,
																																				onSaveEdit,
																																				onStartEdit,
																																				onToggle,
																																			}) => (
	<div className={ styles.providerItem }>
		<div className={ styles.providerRow }>
			<div className={ styles.providerDetails }>
				<div className={ styles.providerName }>{ provider.label }</div>
			</div>
			<div className={ styles.providerActions }>
				<CircuitToggle
					checked={ provider.enabled }
					ariaLabel={ `${ provider.enabled ? "Disable" : "Enable" } ${ provider.label } provider` }
					size="compact"
					onChange={ (checked) => onToggle(
						provider.id,
						checked,
					) }
				/>
				<Button
					size="small"
					icon={ <EditOutlined/> }
					aria-label={ `Edit ${ provider.label } provider` }
					onClick={ () => onStartEdit(provider.id) }
				/>
				<Popconfirm
					title="Delete provider?"
					description={ `Remove ${ provider.label } from Download search providers?` }
					okText="Confirm"
					cancelText="Cancel"
					onConfirm={ () => onDelete(provider.id) }
				>
					<Button
						size="small"
						danger
						icon={ <DeleteOutlined/> }
						aria-label={ `Delete ${ provider.label } provider` }
					/>
				</Popconfirm>
			</div>
		</div>
		{ isEditing ? (
			<DownloadProviderForm
				draft={ editDraft }
				onCancel={ onCancelEdit }
				onChange={ onEditDraftChange }
				onSave={ onSaveEdit }
			/>
		) : null }
	</div>
);

function areDownloadProviderItemPropsEqual(
	previousProps: DownloadProviderItemProps,
	nextProps: DownloadProviderItemProps,
): boolean {
	return previousProps.provider === nextProps.provider
		&& previousProps.isEditing === nextProps.isEditing
		&& previousProps.editDraft === nextProps.editDraft
		&& previousProps.onCancelEdit === nextProps.onCancelEdit
		&& previousProps.onDelete === nextProps.onDelete
		&& previousProps.onEditDraftChange === nextProps.onEditDraftChange
		&& previousProps.onSaveEdit === nextProps.onSaveEdit
		&& previousProps.onStartEdit === nextProps.onStartEdit
		&& previousProps.onToggle === nextProps.onToggle;
}

const DownloadProviderItem = memo(
	DownloadProviderItemComponent,
	areDownloadProviderItemPropsEqual,
);

export default DownloadProviderItem;
