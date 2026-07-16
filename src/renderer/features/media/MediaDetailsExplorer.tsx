import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import { FC } from "react";
import MediaCatalogDetails from "./components/MediaCatalogDetails";
import MediaDetailsHero from "./components/MediaDetailsHero";
import MediaGroupsSection from "./components/MediaGroupsSection";
import { useMediaDetailsExplorerController } from "./hooks/useMediaDetailsExplorerController";
import styles from "./MediaDetailsExplorer.module.css";

const MediaDetailsExplorer: FC = () => {
	const {
					errorMessage,
					isLoading,
					isRefreshingMetadata,
					isUpdatingIntegrationStatus,
					isUpdatingWatchedState,
					media,
					editMedia,
					ignoreMedia,
					openGenreFilter,
					openTagFilter,
					refreshMetadata,
					toggleWatched,
				} = useMediaDetailsExplorerController();

	if (isLoading) {
		return (
			<section className="flex-center full-screen-v">
				<Spin size="large"/>
			</section>
		);
	}

	if (errorMessage) {
		return <Result
			status="error"
			title="Could not load media details"
			subTitle={ errorMessage }
		/>;
	}

	if (!media) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Media not found."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<MediaDetailsHero
				media={ media }
				isRefreshingMetadata={ isRefreshingMetadata }
				isUpdatingIntegrationStatus={ isUpdatingIntegrationStatus }
				isUpdatingWatchedState={ isUpdatingWatchedState }
				onRefreshMetadata={ () => {
					void refreshMetadata();
				} }
				onIgnore={ () => {
					void ignoreMedia();
				} }
				onEdit={ editMedia }
				onWatchedToggle={ () => {
					void toggleWatched();
				} }
			/>
			<MediaCatalogDetails
				media={ media }
				onGenreClick={ openGenreFilter }
				onTagClick={ openTagFilter }
			/>
			<MediaGroupsSection groups={ media.groups }/>
		</section>
	);
};

export default MediaDetailsExplorer;
