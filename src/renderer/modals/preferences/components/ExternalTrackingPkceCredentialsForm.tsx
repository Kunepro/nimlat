import { LinkOutlined } from "@ant-design/icons";
import type {
	ExternalTrackingAccount,
	ExternalTrackingProvider,
} from "@nimlat/types/external-tracking";
import {
	Button,
	Input,
} from "antd";
import type { FC } from "react";
import {
	type ExternalTrackingProviderDraft,
	getExternalTrackingProviderName,
} from "../external-tracking-preferences-model";
import styles from "../PreferencesModal.module.css";

interface ExternalTrackingPkceCredentialsFormProps {
	account: ExternalTrackingAccount;
	draft: ExternalTrackingProviderDraft;
	disabled: boolean;
	isBusy: boolean;
	onStartConnection: (provider: ExternalTrackingProvider) => void;
	onUpdateDraft: (provider: ExternalTrackingProvider, patch: Partial<ExternalTrackingProviderDraft>) => void;
}

const ExternalTrackingPkceCredentialsForm: FC<ExternalTrackingPkceCredentialsFormProps> = ({
																																														 account,
																																														 draft,
																																														 disabled,
																																														 isBusy,
																																														 onStartConnection,
																																														 onUpdateDraft,
																																													 }) => (
	<div className={ styles.providerForm }>
		<Input
			value={ draft.clientId }
			placeholder="Client ID"
			disabled={ disabled }
			onChange={ event => onUpdateDraft(
				account.provider,
				{ clientId: event.target.value },
			) }
		/>
		<Input
			value={ draft.redirectUri }
			placeholder="Redirect URI"
			disabled={ disabled }
			readOnly
		/>
		<Button
			type="primary"
			icon={ <LinkOutlined/> }
			loading={ isBusy && account.status !== "connected" }
			disabled={ disabled || account.status === "connected" || draft.clientId.trim().length === 0 }
			onClick={ () => onStartConnection(account.provider) }
		>
			{ `Connect ${ getExternalTrackingProviderName(account.provider) }` }
		</Button>
	</div>
);

export default ExternalTrackingPkceCredentialsForm;
