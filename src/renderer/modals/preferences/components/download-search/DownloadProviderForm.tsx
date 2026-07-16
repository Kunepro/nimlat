import { QuestionCircleOutlined } from "@ant-design/icons";
import type { DownloadSearchProviderCategory } from "@nimlat/types/download-search";
import {
	Button,
	Input,
	Select,
	Tooltip,
} from "antd";
import type { FC } from "react";
import type { DownloadProviderFormState } from "../../../../types/modals";
import {
	DOWNLOAD_PROVIDER_CATEGORY_OPTIONS,
	PROVIDER_CATEGORY_HELP,
	PROVIDER_URL_HELP,
} from "../../download-search-preferences-model";
import styles from "../../PreferencesModal.module.css";

interface DownloadProviderFormProps {
	draft: DownloadProviderFormState;
	onCancel: () => void;
	onChange: (patch: Partial<DownloadProviderFormState>) => void;
	onSave: () => void;
}

const DownloadProviderForm: FC<DownloadProviderFormProps> = ({
																															 draft,
																															 onCancel,
																															 onChange,
																															 onSave,
																														 }) => (
	<div className={ styles.providerForm }>
		<Input
			value={ draft.label }
			placeholder="Title"
			suffix={ (
				<Tooltip title="Title">
					<QuestionCircleOutlined/>
				</Tooltip>
			) }
			onChange={ (event) => onChange({ label: event.target.value }) }
		/>
		<div className={ styles.providerCategoryField }>
			<Select
				value={ draft.category }
				options={ DOWNLOAD_PROVIDER_CATEGORY_OPTIONS }
				onChange={ (category: DownloadSearchProviderCategory) => onChange({ category }) }
			/>
			<Tooltip title={ PROVIDER_CATEGORY_HELP }>
				<QuestionCircleOutlined className={ styles.providerCategoryHelp }/>
			</Tooltip>
		</div>
		<Input
			value={ draft.baseUrl }
			placeholder="https://example.com/search?q={query}"
			suffix={ (
				<Tooltip title={ PROVIDER_URL_HELP }>
					<QuestionCircleOutlined/>
				</Tooltip>
			) }
			onChange={ (event) => onChange({ baseUrl: event.target.value }) }
			onPressEnter={ onSave }
		/>
		<div className={ styles.providerFormActions }>
			<Button onClick={ onCancel }>
				Cancel
			</Button>
			<Button
				type="primary"
				onClick={ onSave }
			>
				Save provider
			</Button>
		</div>
	</div>
);

export default DownloadProviderForm;
