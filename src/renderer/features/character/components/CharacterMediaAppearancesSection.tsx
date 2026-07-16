import type { CharacterMediaCard as CharacterMediaCardData } from "@nimlat/types/ipc-payloads";
import Empty from "antd/es/empty";
import type { FC } from "react";
import { createCharacterMediaKey } from "../character-details-explorer-model";
import styles from "../CharacterDetailsExplorer.module.css";
import CharacterMediaCard from "./CharacterMediaCard";

interface CharacterMediaAppearancesSectionProps {
	medias: CharacterMediaCardData[];
}

const CharacterMediaAppearancesSection: FC<CharacterMediaAppearancesSectionProps> = ({ medias }) => (
	<>
		<div className={ styles.mediaSectionHeader }>
			<h2>Appears in</h2>
			<span>{ medias.length } media</span>
		</div>
		{ medias.length > 0 ? (
			<div className={ styles.mediaGrid }>
				{ medias.map((media) => (
					<CharacterMediaCard
						key={ createCharacterMediaKey(media) }
						media={ media }
					/>
				)) }
			</div>
		) : (
			<Empty description="No media appearances are loaded for this character yet."/>
		) }
	</>
);

export default CharacterMediaAppearancesSection;
