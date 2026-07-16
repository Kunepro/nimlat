import type { MediaCharacterListItem } from "@nimlat/types/ipc-payloads";
import type { FC } from "react";
import { resolveImageSrc } from "../../../../utils/resolve-image-src";
import styles from "../MediaCharactersExplorer.module.css";
import {
	type CharacterCardDisplay,
	getCharacterCardFallbackInitial,
} from "./character-card-model";

interface CharacterCardContentProps {
	character: MediaCharacterListItem;
	display: CharacterCardDisplay;
}

const CharacterCardContent: FC<CharacterCardContentProps> = ({
																															 character,
																															 display,
																														 }) => (
	<>
		<div className={ styles.portraitFrame }>
			{ display.imageUrl ? (
				<img
					className={ styles.portrait }
					src={ resolveImageSrc(display.imageUrl) }
					alt=""
					loading="lazy"
				/>
			) : (
				<div className={ styles.portraitFallback }>
					{ getCharacterCardFallbackInitial(display) }
				</div>
			) }
		</div>
		<div className={ styles.cardBody }>
			<div className={ styles.characterName }>{ display.name }</div>
			{ display.secondary ? <div className={ styles.nativeName }>{ display.secondary }</div> : null }
			{ character.role ? <div className={ styles.role }>{ character.role }</div> : null }
		</div>
	</>
);

export default CharacterCardContent;
