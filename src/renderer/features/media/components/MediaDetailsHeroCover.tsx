import { WatchedCardOverlay } from "@nimlat/components";
import type { FC } from "react";
import styles from "./MediaDetailsHero.module.css";

interface MediaDetailsHeroCoverProps {
	isWatched: boolean;
	mediaName: string;
	resolvedImageUrl?: string;
	onOpenPreview: () => void;
}

const MediaDetailsHeroCover: FC<MediaDetailsHeroCoverProps> = ({
																																 isWatched,
																																 mediaName,
																																 resolvedImageUrl,
																																 onOpenPreview,
																															 }) => (
	<div className={ styles.coverColumn }>
		{ resolvedImageUrl ? (
			<button
				type="button"
				className={ styles.coverButton }
				aria-label={ `Open ${ mediaName } image full size` }
				onClick={ onOpenPreview }
			>
				<img
					src={ resolvedImageUrl }
					alt={ mediaName }
					className={ styles.coverImage }
				/>
				{ isWatched ? <WatchedCardOverlay/> : null }
			</button>
		) : (
			<div
				className={ styles.coverPlaceholder }
				aria-hidden="true"
			/>
		) }
	</div>
);

export default MediaDetailsHeroCover;
