import {
	CalendarOutlined,
	ClockCircleOutlined,
	QuestionCircleOutlined,
	StarOutlined,
} from "@ant-design/icons";
import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import Tooltip from "antd/es/tooltip";
import type {
	FC,
	ReactNode,
} from "react";
import {
	createEpisodeMetadataItems,
	type EpisodeMetadataItem,
} from "../episode-list-formatters";
import styles from "../MediaEpisodesExplorer.module.css";

interface EpisodeMetadataRailProps {
	episode: MediaEpisodeInspectionRow;
}

function renderMetadataIcon(item: EpisodeMetadataItem): ReactNode {
	if (!item.isKnown) {
		return <QuestionCircleOutlined/>;
	}

	switch (item.kind) {
		case "aired":
			return <CalendarOutlined/>;
		case "duration":
			return <ClockCircleOutlined/>;
		case "score":
			return <StarOutlined/>;
		default:
			return null;
	}
}

function getMetadataItemClassName(item: EpisodeMetadataItem): string {
	const classes = [ styles.metadataItem ];
	if (!item.isKnown) {
		classes.push(styles.metadataItemUnknown);
	}
	return classes.join(" ");
}

const EpisodeMetadataRail: FC<EpisodeMetadataRailProps> = ({ episode }) => (
	<div
		className={ styles.metadataRail }
		aria-label="Episode metadata"
	>
		{ createEpisodeMetadataItems(episode).map(item => (
			<Tooltip
				key={ item.kind }
				title={ item.tooltip }
				mouseEnterDelay={ 0.15 }
			>
				<span
					className={ getMetadataItemClassName(item) }
					role="img"
					aria-label={ item.tooltip }
				>
					<span
						className={ styles.metadataIcon }
						aria-hidden="true"
					>
						{ renderMetadataIcon(item) }
					</span>
					{ item.value ? (
						<span className={ styles.metadataValue }>
							{ item.value }
						</span>
					) : null }
				</span>
			</Tooltip>
		)) }
	</div>
);

export default EpisodeMetadataRail;
