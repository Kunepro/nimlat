import {
	CalendarOutlined,
	SettingOutlined,
	SyncOutlined,
	WarningOutlined,
} from "@ant-design/icons";
import { useNavigate } from "@tanstack/react-router";
import {
	FC,
	useCallback,
} from "react";
import { ROUTES } from "../../constants/route-config";
import { useOpenPreferencesModal } from "../../modals/preferences/preferences-modal.state";
import NetworkStatusIndicator from "../netword-status-indicator/NetworkStatusIndicator";
import { TopBarActionButton } from "./components/TopBarActionButton";
import { TopBarTitle } from "./components/TopBarTitle";
import styles from "./TopBar.module.css";

const TopBar: FC = () => {
	const navigate             = useNavigate();
	const openPreferencesModal = useOpenPreferencesModal();
	const navigateToLibrary          = useCallback(
		() => {
			void navigate({ to: ROUTES.GROUPS.FULL_URL });
		},
		[ navigate ],
	);
	const navigateToAnimeDbScan      = useCallback(
		() => {
			void navigate({ to: ROUTES.POPULATE_ANIME_DB });
		},
		[ navigate ],
	);
	const navigateToErroredContent   = useCallback(
		() => {
			void navigate({ to: ROUTES.ERRORED_CONTENT.FULL_URL });
		},
		[ navigate ],
	);
	const navigateToReleaseWatch     = useCallback(
		() => {
			void navigate({ to: ROUTES.RELEASE_WATCH.FULL_URL });
		},
		[ navigate ],
	);
	return (
		<div className={ styles.topBar }>
			<TopBarTitle onNavigate={ navigateToLibrary }/>

			<div className={ styles.actions }>
				<NetworkStatusIndicator/>
				<TopBarActionButton
					title="Scan anime catalog"
					icon={ <SyncOutlined/> }
					onClick={ navigateToAnimeDbScan }
					ariaLabel="Scan anime catalog"
					className={ styles.animeDbScanButton }
					testId="topbar-anime-db-scan-button"
				/>
				<TopBarActionButton
					title="Errored content"
					icon={ <WarningOutlined/> }
					onClick={ navigateToErroredContent }
					ariaLabel="Open errored content"
					className={ styles.erroredContentButton }
					testId="topbar-errored-content-button"
				/>
				<TopBarActionButton
					title="Release watch"
					icon={ <CalendarOutlined/> }
					onClick={ navigateToReleaseWatch }
					ariaLabel="Open release watch"
					className={ styles.releaseWatchButton }
					testId="topbar-release-watch-button"
				/>
				<TopBarActionButton
					title="Preferences"
					icon={ <SettingOutlined/> }
					onClick={ openPreferencesModal }
					ariaLabel="Open preferences"
					className={ styles.gearButton }
				/>
			</div>
		</div>
	);
};

export default TopBar;
