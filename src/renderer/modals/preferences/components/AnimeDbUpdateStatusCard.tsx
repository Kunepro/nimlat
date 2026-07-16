import {
	DatabaseOutlined,
	DownloadOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import {
	Alert,
	Button,
	Space,
} from "antd";
import type { FC } from "react";
import styles from "../PreferencesModal.module.css";

interface AnimeDbUpdateStatusCardProps {
	animeDbReleaseStatusMessage: string;
	canDownloadAnimeDb: boolean;
	installedAnimeDbVersion: string;
	isAnimeDbReleaseStatusLoading: boolean;
	latestAnimeDbVersion: string;
	releaseErrorMessage: string | null;
	onCheckAnimeDbReleaseStatus: () => void;
	onOpenAnimeDbDownload: () => void;
	onOpenAnimeDbScanner: () => void;
}

const AnimeDbUpdateStatusCard: FC<AnimeDbUpdateStatusCardProps> = ({
																																		 animeDbReleaseStatusMessage,
																																		 canDownloadAnimeDb,
																																		 installedAnimeDbVersion,
																																		 isAnimeDbReleaseStatusLoading,
																																		 latestAnimeDbVersion,
																																		 releaseErrorMessage,
																																		 onCheckAnimeDbReleaseStatus,
																																		 onOpenAnimeDbDownload,
																																		 onOpenAnimeDbScanner,
																																	 }) => (
	<div className={ styles.appUpdateCard }>
		<div className={ styles.settingLabel }>AnimeDB</div>
		<div className={ styles.appVersionGrid }>
			<div>
				<div className={ styles.appVersionLabel }>Downloaded version</div>
				<div className={ styles.appVersionValue }>{ installedAnimeDbVersion }</div>
			</div>
			<div>
				<div className={ styles.appVersionLabel }>Latest published version</div>
				<div className={ styles.appVersionValue }>{ latestAnimeDbVersion }</div>
			</div>
		</div>
		{ releaseErrorMessage ? (
			<Alert
				type="warning"
				message="Could not check the latest AnimeDB release."
				showIcon
			/>
		) : null }
		<Alert
			type={ canDownloadAnimeDb ? "info" : "success" }
			message={ animeDbReleaseStatusMessage }
			showIcon
		/>
		<Space wrap>
			<Button
				icon={ <ReloadOutlined/> }
				loading={ isAnimeDbReleaseStatusLoading }
				onClick={ onCheckAnimeDbReleaseStatus }
			>
				Check AnimeDB updates
			</Button>
			<Button
				type="primary"
				icon={ <DownloadOutlined/> }
				disabled={ !canDownloadAnimeDb || isAnimeDbReleaseStatusLoading }
				onClick={ onOpenAnimeDbDownload }
			>
				Download AnimeDB
			</Button>
			<Button
				icon={ <DatabaseOutlined/> }
				onClick={ onOpenAnimeDbScanner }
			>
				Open Catalog Scanner
			</Button>
		</Space>
	</div>
);

export default AnimeDbUpdateStatusCard;
