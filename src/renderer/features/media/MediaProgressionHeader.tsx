import {
	getIntegrationStatusLabel,
	isTrackedIntegrationStatus,
} from "@nimlat/constants/integration-status";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import { FC } from "react";
import styles from "./MediaProgressionHeader.module.css";

interface MediaProgressionHeaderProps {
	integrationPercent?: number | null;
	integrationStatus?: IntegrationStatus | null;
}

function clampPercent(value: number): number {
	return Math.max(
		0,
		Math.min(
			100,
			Math.round(value),
		),
	);
}

const MediaProgressionHeader: FC<MediaProgressionHeaderProps> = ({
																																	 integrationPercent,
																																	 integrationStatus,
																																 }) => {
	const shouldShowPercentage = isTrackedIntegrationStatus(integrationStatus);
	const completionPercent    = shouldShowPercentage ? clampPercent(integrationPercent ?? 0) : null;
	const statusLabel          = shouldShowPercentage ? null : getIntegrationStatusLabel(integrationStatus);

	return (
		<div
			className={ styles.completion }
			aria-label={ completionPercent == null
				? `Media tracker status ${ statusLabel }`
				: `Media tracker progress ${ completionPercent } percent` }
		>
			{ statusLabel == null
				? null
				: <div className={ styles.status }>{ statusLabel }</div> }
			{ completionPercent == null
				? null
				: (
					<>
						<div className={ styles.track }>
							<div
								className={ `${ styles.fill } ${ completionPercent === 100 ? styles.fillComplete : "" }` }
								style={ { width: `${ completionPercent }%` } }
							/>
						</div>
						<div className={ styles.value }>{ completionPercent }%</div>
					</>
				) }
		</div>
	);
};

export default MediaProgressionHeader;
