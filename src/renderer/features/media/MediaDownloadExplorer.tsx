import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import { FC } from "react";
import type { MediaDownloadExplorerReadyState } from "./media-download-explorer/media-download-explorer-state-types";
import MediaDownloadExplorerContent from "./media-download-explorer/MediaDownloadExplorerContent";
import { useMediaDownloadExplorerState } from "./media-download-explorer/use-media-download-explorer-state";
import styles from "./MediaDownloadExplorer.module.css";

const MediaDownloadExplorer: FC = () => {
	const state = useMediaDownloadExplorerState();

	if (state.isLoading) {
		return (
			<section className="flex-center full-screen-v">
				<Spin size="large"/>
			</section>
		);
	}

	if (state.errorMessage) {
		return <Result
			status="error"
			title="Could not load download search"
			subTitle={ state.errorMessage }
		/>;
	}

	if (!state.media) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Media not found."/>
			</section>
		);
	}

	const readyState: MediaDownloadExplorerReadyState = {
		...state,
		media: state.media,
	};

	return (
		<section className={ styles.wrapper }>
			<MediaDownloadExplorerContent state={ readyState }/>
		</section>
	);
};

export default MediaDownloadExplorer;
