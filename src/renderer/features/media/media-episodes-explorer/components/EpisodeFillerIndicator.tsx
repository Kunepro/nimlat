import { FlagFilled } from "@ant-design/icons";
import Tooltip from "antd/es/tooltip";
import type { FC } from "react";
import styles from "../MediaEpisodesExplorer.module.css";

interface EpisodeFillerIndicatorProps {
	isFiller?: boolean;
}

const EpisodeFillerIndicator: FC<EpisodeFillerIndicatorProps> = ({ isFiller }) => {
	if (isFiller !== true) {
		return null;
	}

	return (
		<Tooltip title="Filler episode">
			<span
				className={ styles.fillerIndicator }
				role="img"
				aria-label="Filler episode"
			>
				<FlagFilled/>
			</span>
		</Tooltip>
	);
};

export default EpisodeFillerIndicator;
