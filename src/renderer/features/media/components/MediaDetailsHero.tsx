import Modal from "antd/es/modal";
import type { FC } from "react";
import { useMemo } from "react";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import { useMediaDetailsHeroPreview } from "./hooks/useMediaDetailsHeroPreview";
import {
	buildMediaHeroDetailGroups,
	type MediaDetailsInspection,
	resolveMediaHeroIgnorePresentation,
	resolveMediaHeroWatchedLabel,
	selectMediaHeroBannerImageUrl,
} from "./media-details-hero-model";
import styles from "./MediaDetailsHero.module.css";
import MediaDetailsHeroBody from "./MediaDetailsHeroBody";
import MediaDetailsHeroCover from "./MediaDetailsHeroCover";
import MediaDetailsHeroDetails from "./MediaDetailsHeroDetails";

interface MediaDetailsHeroProps {
	media: MediaDetailsInspection;
	isRefreshingMetadata: boolean;
	isUpdatingIntegrationStatus: boolean;
	isUpdatingWatchedState: boolean;
	onRefreshMetadata: () => void;
	onIgnore: () => void;
	onEdit: () => void;
	onWatchedToggle: () => void;
}

const MediaDetailsHero: FC<MediaDetailsHeroProps> = ({
																											 media,
																											 isRefreshingMetadata,
																											 isUpdatingIntegrationStatus,
																											 isUpdatingWatchedState,
																											 onRefreshMetadata,
																											 onIgnore,
																											 onEdit,
																											 onWatchedToggle,
																										 }) => {
	const {
					closePreview,
					isPreviewOpen,
					openPreview,
					resolvedImageUrl,
				}                  = useMediaDetailsHeroPreview(media);
	const bannerImageUrl         = selectMediaHeroBannerImageUrl(media);
	const resolvedBannerImageUrl = useMemo(
		() => bannerImageUrl ? resolveImageSrc(bannerImageUrl) : undefined,
		[ bannerImageUrl ],
	);
	const isWatched          = media.isWatched === true;
	const watchedLabel       = resolveMediaHeroWatchedLabel(isWatched);
	const ignorePresentation = useMemo(
		() => resolveMediaHeroIgnorePresentation(
			media.integrationStatus,
			isUpdatingIntegrationStatus,
		),
		[
			isUpdatingIntegrationStatus,
			media.integrationStatus,
		],
	);
	const detailGroups       = useMemo(
		() => buildMediaHeroDetailGroups(media),
		[ media ],
	);

	return (
		<section className={ resolvedBannerImageUrl ? `${ styles.hero } ${ styles.heroWithBanner }` : styles.hero }>
			{ resolvedBannerImageUrl ? (
				<img
					className={ styles.heroBannerBackdrop }
					src={ resolvedBannerImageUrl }
					alt=""
					aria-hidden="true"
				/>
			) : null }
			<MediaDetailsHeroCover
				isWatched={ isWatched }
				mediaName={ media.name }
				resolvedImageUrl={ resolvedImageUrl }
				onOpenPreview={ openPreview }
			/>
			<MediaDetailsHeroBody
				description={ media.description }
				ignorePresentation={ ignorePresentation }
				isRefreshingMetadata={ isRefreshingMetadata }
				isUpdatingWatchedState={ isUpdatingWatchedState }
				isWatched={ isWatched }
				mediaName={ media.name }
				watchedLabel={ watchedLabel }
				onEdit={ onEdit }
				onIgnore={ onIgnore }
				onRefreshMetadata={ onRefreshMetadata }
				onWatchedToggle={ onWatchedToggle }
			/>
			<MediaDetailsHeroDetails detailGroups={ detailGroups }/>
			<Modal
				centered
				className={ styles.imagePreviewModal }
				footer={ null }
				open={ isPreviewOpen }
				title={ media.name }
				width="fit-content"
				onCancel={ closePreview }
			>
				{ resolvedImageUrl ? (
					<img
						src={ resolvedImageUrl }
						alt={ media.name }
						className={ styles.imagePreview }
					/>
				) : null }
			</Modal>
		</section>
	);
};

export default MediaDetailsHero;
