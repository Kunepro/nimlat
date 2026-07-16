import type { VoiceActorCharacterMediaCard } from "@nimlat/types/ipc-payloads";
import Empty from "antd/es/empty";
import type { FC } from "react";
import styles from "../../character/CharacterDetailsExplorer.module.css";
import { createVoiceActorAppearanceKey } from "../voice-actor-details-explorer-model";
import VoiceActorAppearanceCard from "./VoiceActorAppearanceCard";

interface VoiceActorCreditsSectionProps {
	appearances: VoiceActorCharacterMediaCard[];
}

const VoiceActorCreditsSection: FC<VoiceActorCreditsSectionProps> = ({ appearances }) => (
	<>
		<div className={ styles.mediaSectionHeader }>
			<h2>Credits</h2>
			<span>{ appearances.length } loaded</span>
		</div>
		{ appearances.length > 0 ? (
			<div className={ styles.mediaGrid }>
				{ appearances.map((appearance) => (
					<VoiceActorAppearanceCard
						key={ createVoiceActorAppearanceKey(appearance) }
						appearance={ appearance }
					/>
				)) }
			</div>
		) : (
			<Empty description="No local character/media credits are loaded for this voice actor yet."/>
		) }
	</>
);

export default VoiceActorCreditsSection;
