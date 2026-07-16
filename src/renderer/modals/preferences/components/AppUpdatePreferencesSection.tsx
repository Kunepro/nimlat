import type { FC } from "react";
import { AppUpdateFacade } from "../../../facades";
import { useAppUpdatePreferencesController } from "../hooks/useAppUpdatePreferencesController";
import styles from "../PreferencesModal.module.css";
import AnimeDbUpdateStatusCard from "./AnimeDbUpdateStatusCard";
import AppUpdateStatusCard from "./AppUpdateStatusCard";
import SourceAvailabilityRightsBlock from "./SourceAvailabilityRightsBlock";

interface AppUpdatePreferencesSectionProps {
	isPreferencesOpen: boolean;
	onOpenAnimeDbDownload: () => void;
	onOpenAnimeDbScanner: () => void;
}

const AppUpdatePreferencesSection: FC<AppUpdatePreferencesSectionProps> = ({
																																						 isPreferencesOpen,
																																						 onOpenAnimeDbDownload,
																																						 onOpenAnimeDbScanner,
																																					 }) => {
	const {
					animeDbReleaseErrorMessage,
					animeDbReleaseStatusMessage,
					canDownloadAnimeDb,
					canUpdateApp,
					checkForUpdates,
					currentVersion,
					installedAnimeDbVersion,
					isActionRunning,
					isAnimeDbReleaseStatusLoading,
					isChecking,
					isDownloading,
					latestAnimeDbVersion,
					latestPublishedAppVersion,
					status,
					statusMessage,
					checkAnimeDbReleaseStatus,
					updateApp,
					updateAppLabel,
				} = useAppUpdatePreferencesController(isPreferencesOpen);

	return (
		<div className={ styles.settingColumn }>
			{ AppUpdateFacade.isIntegratedUpdaterVisible() ? (
				<AppUpdateStatusCard
					canUpdateApp={ canUpdateApp }
					currentVersion={ currentVersion }
					isActionRunning={ isActionRunning }
					isChecking={ isChecking }
					isDownloading={ isDownloading }
					latestPublishedAppVersion={ latestPublishedAppVersion }
					status={ status }
					statusMessage={ statusMessage }
					updateAppLabel={ updateAppLabel }
					onCheckForUpdates={ checkForUpdates }
					onUpdateApp={ updateApp }
				/>
			) : null }

			<AnimeDbUpdateStatusCard
				animeDbReleaseStatusMessage={ animeDbReleaseStatusMessage }
				canDownloadAnimeDb={ canDownloadAnimeDb }
				installedAnimeDbVersion={ installedAnimeDbVersion }
				isAnimeDbReleaseStatusLoading={ isAnimeDbReleaseStatusLoading }
				latestAnimeDbVersion={ latestAnimeDbVersion }
				releaseErrorMessage={ animeDbReleaseErrorMessage }
				onCheckAnimeDbReleaseStatus={ checkAnimeDbReleaseStatus }
				onOpenAnimeDbDownload={ onOpenAnimeDbDownload }
				onOpenAnimeDbScanner={ onOpenAnimeDbScanner }
			/>

			<div className={ styles.settingDivider }/>

			<SourceAvailabilityRightsBlock/>
		</div>
	);
};

export default AppUpdatePreferencesSection;
