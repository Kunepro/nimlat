import { CircuitToggle } from "@nimlat/components";
import type {
	FC,
	MouseEvent,
} from "react";
import styles from "../../PreferencesModal.module.css";

interface ExternalTrackingProviderToggleProps {
	checked: boolean;
	isZapped: boolean;
	providerName: string;
}

const ExternalTrackingProviderToggle: FC<ExternalTrackingProviderToggleProps> = ({
																																									 checked,
																																									 isZapped,
																																									 providerName,
																																								 }) => (
	<div
		className={ styles.externalTrackingToggleSlot }
		onClick={ (event: MouseEvent<HTMLDivElement>) => event.stopPropagation() }
	>
		<CircuitToggle
			checked={ checked }
			readOnly
			ariaLabel={ `${ providerName } integration status` }
			size="compact"
			className={ isZapped ? styles.externalTrackingToggleZapped : "" }
			onChange={ () => {} }
		/>
	</div>
);

export default ExternalTrackingProviderToggle;
