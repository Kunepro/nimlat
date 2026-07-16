import {
	CheckOutlined,
	LoadingOutlined,
} from "@ant-design/icons";
import { WatchedCardOverlay } from "@nimlat/components";
import type { MediaEpisodeInspectionRow } from "@nimlat/types/ipc-payloads";
import type { FC } from "react";
import styles from "../MediaEpisodesExplorer.module.css";
import {
	resolveEpisodeThumbnailAlt,
	resolveEpisodeWatchedToggle,
} from "./episode-list-row-model";

interface EpisodeListRowThumbnailProps {
	episode: MediaEpisodeInspectionRow;
	episodeThumbnail: string;
	placeholderThumbnail: string;
	isUpdatingWatched: boolean;
	onWatchedToggle: (episodeNumber: number, nextIsWatched: boolean) => void | Promise<void>;
}

const EpisodeListRowThumbnail: FC<EpisodeListRowThumbnailProps> = ({
																																		 episode,
																																		 episodeThumbnail,
																																		 placeholderThumbnail,
																																		 isUpdatingWatched,
																																		 onWatchedToggle,
																																	 }) => {
	const watchedToggle = resolveEpisodeWatchedToggle(episode);

	return (
		<div
			className={ styles.thumbWrap }
			data-watched={ watchedToggle.checked ? "true" : "false" }
			data-updating={ isUpdatingWatched ? "true" : "false" }
		>
			<img
				src={ episodeThumbnail }
				alt={ resolveEpisodeThumbnailAlt(episode) }
				className={ styles.thumb }
				loading="lazy"
				decoding="async"
				onError={ (event) => {
					if (event.currentTarget.src === placeholderThumbnail) {
						return;
					}
					event.currentTarget.src = placeholderThumbnail;
				} }
			/>
			{ watchedToggle.checked ? <WatchedCardOverlay orientation="landscape"/> : null }
			{ !watchedToggle.checked ? (
				<div className={ styles.thumbHoverWatchedEffect }>
					<WatchedCardOverlay orientation="landscape"/>
				</div>
			) : null }
			<button
				type="button"
				className={ styles.thumbWatchedButton }
				aria-label={ watchedToggle.ariaLabel }
				aria-pressed={ watchedToggle.checked }
				disabled={ isUpdatingWatched }
				onClick={ () => {
					void onWatchedToggle(
						episode.episodeNumber,
						watchedToggle.nextIsWatched,
					);
				} }
			>
				<span className={ styles.thumbWatchedPrompt }>
					WATCHED?
				</span>
				<span
					className={ styles.thumbWatchedCheck }
					aria-hidden="true"
				>
					{ isUpdatingWatched ? <LoadingOutlined spin/> : watchedToggle.checked ? <CheckOutlined/> : null }
				</span>
			</button>
		</div>
	);
};

export default EpisodeListRowThumbnail;
