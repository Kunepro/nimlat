import { VoiceActorCharacterMediaCard } from "@nimlat/types/ipc-payloads";
import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { ROUTES } from "../../../constants/route-config";
import { createRouteHistoryState } from "../../../types/router-history-state";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import styles from "../../character/CharacterDetailsExplorer.module.css";

interface VoiceActorAppearanceCardProps {
	appearance: VoiceActorCharacterMediaCard;
}

function VoiceActorAppearanceCardComponent({ appearance }: VoiceActorAppearanceCardProps) {
	const mediaImageUrl = appearance.displayMediaImageUrl || appearance.mediaImageUrl;

	return (
		<Link
			to={ ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL }
			params={ { mediaId: appearance.mediaId.toString() } }
			state={ createRouteHistoryState({
				mediaName: appearance.mediaName,
				isFilm:    appearance.format === "MOVIE",
			}) }
			className={ styles.mediaCard }
		>
			<div className={ styles.mediaPosterFrame }>
				{ mediaImageUrl ? (
					<img
						className={ styles.mediaPoster }
						src={ resolveImageSrc(mediaImageUrl) }
						alt=""
						loading="lazy"
					/>
				) : (
					<div className={ styles.mediaPosterFallback }>
						{ appearance.mediaName.slice(
							0,
							1,
						).toUpperCase() }
					</div>
				) }
			</div>
			<div className={ styles.mediaMeta }>
				<div className={ styles.mediaTitle }>{ appearance.characterName }</div>
				<div className={ styles.mediaSubline }>{ appearance.mediaName }</div>
				<div className={ styles.mediaSubline }>
					{ [
						appearance.format,
						appearance.role,
					].filter(Boolean).join(" / ") || "Appearance" }
				</div>
			</div>
		</Link>
	);
}

function areVoiceActorAppearanceCardPropsEqual(prevProps: VoiceActorAppearanceCardProps, nextProps: VoiceActorAppearanceCardProps): boolean {
	return prevProps.appearance.characterId === nextProps.appearance.characterId
		&& prevProps.appearance.characterName === nextProps.appearance.characterName
		&& prevProps.appearance.mediaId === nextProps.appearance.mediaId
		&& prevProps.appearance.mediaName === nextProps.appearance.mediaName
		&& prevProps.appearance.format === nextProps.appearance.format
		&& prevProps.appearance.mediaImageUrl === nextProps.appearance.mediaImageUrl
		&& prevProps.appearance.displayMediaImageUrl === nextProps.appearance.displayMediaImageUrl
		&& prevProps.appearance.role === nextProps.appearance.role;
}

const VoiceActorAppearanceCard = memo(
	VoiceActorAppearanceCardComponent,
	areVoiceActorAppearanceCardPropsEqual,
);

export default VoiceActorAppearanceCard;
