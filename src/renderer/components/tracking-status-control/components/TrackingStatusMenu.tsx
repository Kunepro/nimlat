import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { FC } from "react";
import { stopTrackingStatusParentNavigation } from "../tracking-status-control-events";
import styles from "../TrackingStatusControl.module.css";
import TrackingStatusRadioGroup from "../TrackingStatusRadioGroup";

interface TrackingStatusMenuProps {
	id: string;
	loading?: boolean;
	value: IntegrationStatus | null;
	onChange: (value: IntegrationStatus | null) => void | Promise<void>;
}

const TrackingStatusMenu: FC<TrackingStatusMenuProps> = ({
																													 id,
																													 loading,
																													 value,
																													 onChange,
																												 }) => (
	<div
		className={ styles.menu }
		onClick={ stopTrackingStatusParentNavigation }
	>
		<TrackingStatusRadioGroup
			id={ id }
			value={ value }
			disabled={ loading }
			onChange={ onChange }
		/>
	</div>
);

export default TrackingStatusMenu;
