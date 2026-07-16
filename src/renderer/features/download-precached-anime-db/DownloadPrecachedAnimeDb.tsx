import { PageNavigationHeader } from "@nimlat/components";
import {
	Card,
	Layout,
	Progress,
	Space,
} from "antd";
import { FC } from "react";
import DownloadAnimeDbActions from "./components/DownloadAnimeDbActions";
import DownloadAnimeDbAlerts from "./components/DownloadAnimeDbAlerts";
import DownloadAnimeDbIntro from "./components/DownloadAnimeDbIntro";
import DownloadAnimeDbStatus from "./components/DownloadAnimeDbStatus";
import { isAnimeDbDownloadRunning } from "./download-precached-anime-db-model";
import styles from "./DownloadPrecachedAnimeDb.module.css";
import { useDownloadPrecachedAnimeDbState } from "./hooks/use-download-precached-anime-db-state";

const { Content } = Layout;

const DownloadPrecachedAnimeDb: FC = () => {
	const {
					progress,
					progressPercent,
					progressStatus,
					visibleUiError,
					isDevMode,
					canSkipToApp,
					canUseLocalCatalog,
					startDownload,
					cancelDownload,
					goToApp,
					goToAniListBuilder,
				} = useDownloadPrecachedAnimeDbState();
	const isRunning = isAnimeDbDownloadRunning(progress.status);

	return (
		<>
			{ canUseLocalCatalog ? <PageNavigationHeader title="Anime DB Downloader"/> : null }
			<Layout className={ styles.layout }>
				<Content className={ `${ styles.content } ${ canUseLocalCatalog ? styles.contentWithHeader : "" }` }>
					<Card className={ styles.card }>
						<Space
							direction="vertical"
							size="large"
							className={ styles.stack }
						>
							<DownloadAnimeDbIntro
								canSkipToApp={ canSkipToApp }
								canUseLocalCatalog={ canUseLocalCatalog }
								isRunning={ isRunning }
								status={ progress.status }
							/>
							<Progress
								percent={ progressPercent }
								status={ progressStatus }
							/>
							<DownloadAnimeDbStatus status={ progress.status }/>
							<DownloadAnimeDbAlerts
								progressError={ progress.errorMessage }
								uiError={ visibleUiError }
							/>
							<DownloadAnimeDbActions
								progress={ progress }
								canSkipToApp={ canSkipToApp }
								canUseLocalCatalog={ canUseLocalCatalog }
								isDevMode={ isDevMode }
								onStartDownload={ () => void startDownload(false) }
								onCancelDownload={ () => void cancelDownload() }
								onSkipToApp={ goToApp }
								onBuildFromAniList={ goToAniListBuilder }
							/>
						</Space>
					</Card>
				</Content>
			</Layout>
		</>
	);
};

export default DownloadPrecachedAnimeDb;
