import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Select from "antd/es/select";
import Spin from "antd/es/spin";
import { FC } from "react";
import CharacterCard from "./media-characters-explorer/components/CharacterCard";
import { useMediaCharacters } from "./media-characters-explorer/hooks/use-media-characters";
import { useVoiceActorLanguageFilter } from "./media-characters-explorer/hooks/useVoiceActorLanguageFilter";
import styles from "./media-characters-explorer/MediaCharactersExplorer.module.css";

const MediaCharactersExplorer: FC = () => {
	const {
					characters,
					isLoading,
					errorMessage,
				} = useMediaCharacters();
	const {
					voiceActorLanguage,
					voiceActorLanguageOptions,
					setVoiceActorLanguage,
				} = useVoiceActorLanguageFilter(characters);

	if (isLoading) {
		return (
			<section className="flex-center full-screen-v">
				<Spin size="large"/>
			</section>
		);
	}

	if (errorMessage) {
		return <Result
			status="error"
			title="Could not load characters"
			subTitle={ errorMessage }
		/>;
	}

	if (characters.length === 0) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="No characters loaded for this media yet."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<div className={ styles.toolbar }>
				<span>{ characters.length } loaded</span>
				<Select
					aria-label="Voice actor language"
					className={ styles.languageSelect }
					options={ voiceActorLanguageOptions }
					value={ voiceActorLanguage }
					onChange={ setVoiceActorLanguage }
					size="small"
				/>
			</div>
			<div className={ styles.grid }>
				{ characters.map((character) => (
					<CharacterCard
						key={ character.characterId }
						character={ character }
						voiceActorLanguage={ voiceActorLanguage }
					/>
				)) }
			</div>
		</section>
	);
};

export default MediaCharactersExplorer;
