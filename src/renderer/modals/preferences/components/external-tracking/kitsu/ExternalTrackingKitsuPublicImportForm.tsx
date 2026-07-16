import { CloudDownloadOutlined } from "@ant-design/icons";
import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import {
	Button,
	Input,
} from "antd";
import type { FC } from "react";
import type { ExternalTrackingProviderDraft } from "../../../external-tracking-preferences-model";
import styles from "../../../PreferencesModal.module.css";
import ExternalTrackingInfoTooltip from "../ExternalTrackingInfoTooltip";

interface ExternalTrackingKitsuPublicImportFormProps {
	account: ExternalTrackingAccount;
	draft: ExternalTrackingProviderDraft;
	disabled: boolean;
	isBusy: boolean;
	onImport: () => void;
	onUpdateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
}

const ExternalTrackingKitsuPublicImportForm: FC<ExternalTrackingKitsuPublicImportFormProps> = ({
																																																 account,
																																																 draft,
																																																 disabled,
																																																 isBusy,
																																																 onImport,
																																																 onUpdateDraft,
																																															 }) => (
	<div className={ styles.providerForm }>
		<ExternalTrackingInfoTooltip
			ariaLabel="About Kitsu public import"
			content="Bring a public Kitsu anime list into Nimlat using its username or user ID. Changes made in Nimlat aren’t sent to Kitsu."
		/>
		<Input
			autoComplete="username"
			value={ draft.username }
			placeholder="Kitsu username or user ID"
			disabled={ disabled }
			onChange={ event => onUpdateDraft(
				account.provider,
				{ username: event.target.value },
			) }
		/>
		<Button
			type="primary"
			icon={ <CloudDownloadOutlined/> }
			loading={ isBusy }
			disabled={ disabled || draft.username.trim().length === 0 }
			onClick={ onImport }
		>
			Import public profile
		</Button>
	</div>
);

export default ExternalTrackingKitsuPublicImportForm;
