import {
	DownloadSearchProvider,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import Button from "antd/es/button";
import { FC } from "react";
import styles from "./MediaDownloadProviderGrid.module.css";

interface MediaDownloadProviderGridProps {
	providers: DownloadSearchProvider[];
	activeQueryPresets: DownloadSearchQueryPreset[];
	onOpenProviderPresets: (provider: DownloadSearchProvider, targetPresets: DownloadSearchQueryPreset[]) => void;
}

const MediaDownloadProviderGrid: FC<MediaDownloadProviderGridProps> = ({
																																				 providers,
																																				 activeQueryPresets,
																																				 onOpenProviderPresets,
																																			 }) => (
	<div className={ styles.providers }>
		{ providers.map((provider) => (
			<div
				key={ provider.id }
				className={ styles.provider }
			>
				<div className={ styles.providerTitle }>{ provider.label }</div>
				<div className={ styles.providerPresetLinks }>
					<Button
						size="small"
						onClick={ () => onOpenProviderPresets(
							provider,
							activeQueryPresets,
						) }
					>
						All presets
					</Button>
					{ activeQueryPresets.map((preset) => (
						<Button
							key={ preset.id }
							size="small"
							onClick={ () => onOpenProviderPresets(
								provider,
								[ preset ],
							) }
						>
							{ preset.label }
						</Button>
					)) }
				</div>
			</div>
		)) }
	</div>
);

export default MediaDownloadProviderGrid;
