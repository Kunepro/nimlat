import { CharacterVoiceActorCredit } from "@nimlat/types/ipc-payloads";
import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { ROUTES } from "../../../constants/route-config";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import styles from "../CharacterDetailsExplorer.module.css";

interface CharacterVoiceActorCardProps {
	voiceActor: CharacterVoiceActorCredit;
}

function CharacterVoiceActorCardComponent({ voiceActor }: CharacterVoiceActorCardProps) {
	return (
		<Link
			to={ ROUTES.GROUPS.VOICE_ACTOR.FULL_URL }
			params={ { voiceActorId: voiceActor.staffId.toString() } }
			className={ styles.mediaCard }
		>
			<div className={ styles.mediaPosterFrame }>
				{ voiceActor.imageUrl ? (
					<img
						className={ styles.mediaPoster }
						src={ resolveImageSrc(voiceActor.imageUrl) }
						alt=""
						loading="lazy"
					/>
				) : (
					<div className={ styles.mediaPosterFallback }>
						{ voiceActor.name.slice(
							0,
							1,
						).toUpperCase() }
					</div>
				) }
			</div>
			<div className={ styles.mediaMeta }>
				<div className={ styles.mediaTitle }>{ voiceActor.name }</div>
				<div className={ styles.mediaSubline }>
					{ [
						voiceActor.language,
						`${ voiceActor.appearances.length } media`,
					].filter(Boolean).join(" / ") }
				</div>
			</div>
		</Link>
	);
}

function areCharacterVoiceActorCardPropsEqual(prevProps: CharacterVoiceActorCardProps, nextProps: CharacterVoiceActorCardProps): boolean {
	return prevProps.voiceActor.staffId === nextProps.voiceActor.staffId
		&& prevProps.voiceActor.name === nextProps.voiceActor.name
		&& prevProps.voiceActor.imageUrl === nextProps.voiceActor.imageUrl
		&& prevProps.voiceActor.language === nextProps.voiceActor.language
		&& prevProps.voiceActor.appearances.length === nextProps.voiceActor.appearances.length;
}

const CharacterVoiceActorCard = memo(
	CharacterVoiceActorCardComponent,
	areCharacterVoiceActorCardPropsEqual,
);

export default CharacterVoiceActorCard;
