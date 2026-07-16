import { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import {
	Button,
	Space,
} from "antd";
import { FC } from "react";
import {
	canShowAnimeDbSkipToApp,
	getAnimeDbDownloadStartButtonLabel,
	isAnimeDbDownloadRunning,
} from "../download-precached-anime-db-model";

interface DownloadAnimeDbActionsProps {
	progress: AnimeDbDownloadProgressData;
	canSkipToApp: boolean;
	canUseLocalCatalog: boolean;
	isDevMode: boolean;
	onStartDownload: () => void;
	onCancelDownload: () => void;
	onSkipToApp: () => void;
	onBuildFromAniList: () => void;
}

const DownloadAnimeDbActions: FC<DownloadAnimeDbActionsProps> = ({
																																	 progress,
																																	 canSkipToApp,
																																	 canUseLocalCatalog,
																																	 isDevMode,
																																	 onStartDownload,
																																	 onCancelDownload,
																																	 onSkipToApp,
																																	 onBuildFromAniList,
																																 }) => {
	const isRunning        = isAnimeDbDownloadRunning(progress.status);
	const canShowSkipToApp = canShowAnimeDbSkipToApp(
		canSkipToApp,
		canUseLocalCatalog,
		progress.status,
	);

	return (
		<Space>
			{ isRunning ? (
				<Button
					onClick={ onCancelDownload }
				>
					Stop download
				</Button>
			) : (
				<>
					<Button
						type="primary"
						onClick={ onStartDownload }
					>
						{ getAnimeDbDownloadStartButtonLabel(progress.status) }
					</Button>
					{ canShowSkipToApp ? (
						<Button onClick={ onSkipToApp }>
							Skip to App
						</Button>
					) : null }
				</>
			) }
			{ isDevMode ? (
				<Button
					onClick={ onBuildFromAniList }
					disabled={ isRunning }
				>
					Build DB from catalog
				</Button>
			) : null }
		</Space>
	);
};

export default DownloadAnimeDbActions;
