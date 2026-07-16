import { SwapOutlined } from "@ant-design/icons";
import { Link } from "@tanstack/react-router";
import Button from "antd/es/button";
import Tooltip from "antd/es/tooltip";
import { memo } from "react";
import { ROUTES } from "../../../../constants/route-config";
import styles from "../MediaCharactersExplorer.module.css";
import {
	areCharacterCardPropsEqual,
	type CharacterCardProps,
} from "./character-card-model";
import CharacterCardContent from "./CharacterCardContent";
import { useCharacterCardViewMode } from "./hooks/useCharacterCardViewMode";

function CharacterCardComponent({
																	character,
																	voiceActorLanguage,
																}: CharacterCardProps) {
	const {
					canOpenVoiceActor,
					display,
					effectiveViewMode,
					primaryVoiceActor,
					switchDisabled,
					switchLabel,
					switchTitle,
					toggleViewMode,
				}       = useCharacterCardViewMode(
		character,
		voiceActorLanguage,
	);
	const content = (
		<CharacterCardContent
			character={ character }
			display={ display }
		/>
	);

	return (
		<article className={ `${ styles.card } ${ display.isAbsentVoiceActor ? styles.absentCard : "" }` }>
			<Tooltip title={ switchTitle }>
				<span className={ styles.cardSwitchShell }>
					<Button
						aria-label={ switchLabel }
						aria-pressed={ effectiveViewMode === "voiceActor" }
						className={ switchDisabled ? `${ styles.cardSwitch } ${ styles.glitchedSwitch }` : styles.cardSwitch }
						disabled={ switchDisabled }
						icon={ <SwapOutlined/> }
						onClick={ toggleViewMode }
						shape="circle"
						type="default"
					/>
				</span>
			</Tooltip>
			{ effectiveViewMode === "voiceActor" && canOpenVoiceActor ? (
				<Link
					to={ ROUTES.GROUPS.VOICE_ACTOR.FULL_URL }
					params={ { voiceActorId: primaryVoiceActor?.staffId?.toString() ?? "" } }
					className={ styles.cardLink }
				>
					{ content }
				</Link>
			) : (
				<Link
					to={ ROUTES.GROUPS.CHARACTER.FULL_URL }
					params={ { characterId: character.characterId.toString() } }
					className={ styles.cardLink }
				>
					{ content }
				</Link>
			) }
		</article>
	);
}

const CharacterCard = memo(
	CharacterCardComponent,
	areCharacterCardPropsEqual,
);

export default CharacterCard;
