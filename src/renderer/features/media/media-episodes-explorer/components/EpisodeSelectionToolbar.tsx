import {
	type IntegrationStatusControlValue,
	parseIntegrationStatusControlValue,
} from "@nimlat/constants/integration-status";
import { IntegrationStatus } from "@nimlat/types/anime-db";
import Button from "antd/es/button";
import Select from "antd/es/select";
import type { FC } from "react";
import { INTEGRATION_STATUS_OPTIONS } from "../../../../modals/shared/integration-status-options";
import styles from "../MediaEpisodesExplorer.module.css";

const BULK_INTEGRATION_STATUS_OPTIONS = INTEGRATION_STATUS_OPTIONS.filter(option => option.value !== "ignored");

interface EpisodeSelectionToolbarProps {
	selectedCount: number;
	totalCount: number;
	disabled?: boolean;
	onMarkWatched: () => void | Promise<void>;
	onStatusChange: (integrationStatus: IntegrationStatus | null) => void | Promise<void>;
	onClearSelection: () => void;
}

const EpisodeSelectionToolbar: FC<EpisodeSelectionToolbarProps> = ({
																																		 selectedCount,
																																		 totalCount,
																																		 disabled,
																																		 onMarkWatched,
																																		 onStatusChange,
																																		 onClearSelection,
																																	 }) => {
	const hasSelection = selectedCount > 0;
	const isDisabled   = disabled || !hasSelection;

	return (
		<div className={ styles.selectionToolbar }>
			<div className={ styles.selectionCount }>
				{ selectedCount } / { totalCount } selected
			</div>
			<Button
				size="small"
				disabled={ isDisabled }
				loading={ disabled }
				onClick={ () => {
					void onMarkWatched();
				} }
			>
				Watched
			</Button>
			<Select<IntegrationStatusControlValue>
				className={ styles.bulkStatusSelect }
				size="small"
				placeholder="Integration status"
				value={ undefined }
				options={ [ ...BULK_INTEGRATION_STATUS_OPTIONS ] }
				disabled={ isDisabled }
				loading={ disabled }
				onChange={ (nextValue) => {
					void onStatusChange(parseIntegrationStatusControlValue(nextValue));
				} }
			/>
			<Button
				size="small"
				disabled={ disabled || !hasSelection }
				onClick={ onClearSelection }
			>
				Clear
			</Button>
		</div>
	);
};

export default EpisodeSelectionToolbar;
