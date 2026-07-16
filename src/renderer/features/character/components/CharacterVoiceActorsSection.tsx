import type { CharacterVoiceActorCredit } from "@nimlat/types/ipc-payloads";
import type { FC } from "react";
import { createCharacterVoiceActorKey } from "../character-details-explorer-model";
import styles from "../CharacterDetailsExplorer.module.css";
import CharacterVoiceActorCard from "./CharacterVoiceActorCard";

interface CharacterVoiceActorsSectionProps {
	voiceActors: CharacterVoiceActorCredit[];
}

const CharacterVoiceActorsSection: FC<CharacterVoiceActorsSectionProps> = ({ voiceActors }) => {
	if (voiceActors.length === 0) {
		return null;
	}

	return (
		<>
			<div className={ styles.mediaSectionHeader }>
				<h2>Voice actors</h2>
				<span>{ voiceActors.length } loaded</span>
			</div>
			<div className={ styles.mediaGrid }>
				{ voiceActors.map((voiceActor) => (
					<CharacterVoiceActorCard
						key={ createCharacterVoiceActorKey(voiceActor) }
						voiceActor={ voiceActor }
					/>
				)) }
			</div>
		</>
	);
};

export default CharacterVoiceActorsSection;
