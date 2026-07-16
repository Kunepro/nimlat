import { CharacterMediaCard as CharacterMediaCardData } from "@nimlat/types/ipc-payloads";
import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { ROUTES } from "../../../constants/route-config";
import { createRouteHistoryState } from "../../../types/router-history-state";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import styles from "../CharacterDetailsExplorer.module.css";

interface CharacterMediaCardProps {
	media: CharacterMediaCardData;
}

function CharacterMediaCardComponent({ media }: CharacterMediaCardProps) {
	return (
		<Link
			to={ ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL }
			params={ { mediaId: media.mediaId.toString() } }
			state={ createRouteHistoryState({
				mediaName: media.name,
				isFilm:    media.format === "MOVIE",
			}) }
			className={ styles.mediaCard }
		>
			<div className={ styles.mediaPosterFrame }>
				{ media.displayImageUrl || media.imageUrl ? (
					<img
						className={ styles.mediaPoster }
						src={ resolveImageSrc(media.displayImageUrl || media.imageUrl) }
						alt=""
						loading="lazy"
					/>
				) : (
					<div className={ styles.mediaPosterFallback }>
						{ media.name.slice(
							0,
							1,
						).toUpperCase() }
					</div>
				) }
			</div>
			<div className={ styles.mediaMeta }>
				<div className={ styles.mediaTitle }>{ media.name }</div>
				<div className={ styles.mediaSubline }>
					{ [
						media.format,
						media.role,
					].filter(Boolean).join(" / ") || "Media" }
				</div>
			</div>
		</Link>
	);
}

function areCharacterMediaCardPropsEqual(prevProps: CharacterMediaCardProps, nextProps: CharacterMediaCardProps): boolean {
	return prevProps.media.mediaId === nextProps.media.mediaId
		&& prevProps.media.name === nextProps.media.name
		&& prevProps.media.format === nextProps.media.format
		&& prevProps.media.imageUrl === nextProps.media.imageUrl
		&& prevProps.media.displayImageUrl === nextProps.media.displayImageUrl
		&& prevProps.media.role === nextProps.media.role;
}

const CharacterMediaCard = memo(
	CharacterMediaCardComponent,
	areCharacterMediaCardPropsEqual,
);

export default CharacterMediaCard;
