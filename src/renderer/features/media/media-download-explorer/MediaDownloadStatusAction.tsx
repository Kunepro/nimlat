import { CyberRadioButtons } from "@nimlat/components";
import { IntegrationStatus } from "@nimlat/types/anime-db";
import { FC } from "react";
import styles from "./MediaDownloadStatusAction.module.css";

interface MediaDownloadStatusActionProps {
	mediaId: number;
	integrationStatus: IntegrationStatus | null;
	isSettingDownloading: boolean;
	onSetDownloading: () => void;
}

const MediaDownloadStatusAction: FC<MediaDownloadStatusActionProps> = ({
																																				 mediaId,
																																				 integrationStatus,
																																				 isSettingDownloading,
																																				 onSetDownloading,
																																			 }) => (
	<div className={ styles.statusAction }>
		<div
			className={ `${ styles.downloadingRadio } ${ isSettingDownloading
				? styles.downloadingRadioLoading
				: "" }` }
		>
			<CyberRadioButtons
				name={ `media-download-status-${ mediaId }` }
				options={ [
					{
						id:         `media-download-status-${ mediaId }-downloading`,
						value:      "downloading",
						label:      "\u279cloading",
						glitchText: "D_L_I_N_G",
						number:     "R3",
						down:       true,
						checked:    integrationStatus === "downloading",
					},
				] }
				onChange={ () => {
					if (isSettingDownloading || integrationStatus === "downloading") {
						return;
					}
					onSetDownloading();
				} }
			/>
		</div>
	</div>
);

export default MediaDownloadStatusAction;
