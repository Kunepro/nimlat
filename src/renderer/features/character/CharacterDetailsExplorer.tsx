import { InspectionInfoPanel } from "@nimlat/components";
import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import { FC } from "react";
import { useGroupsShellHistoryBackHeader } from "../groups/groups-shell/use-groups-shell-history-back-header";
import {
	buildCharacterInspectionDescription,
	buildCharacterInspectionFields,
} from "./character-details-explorer-model";
import styles from "./CharacterDetailsExplorer.module.css";
import CharacterMediaAppearancesSection from "./components/CharacterMediaAppearancesSection";
import CharacterVoiceActorsSection from "./components/CharacterVoiceActorsSection";
import { useCharacterInspection } from "./hooks/use-character-inspection";

const CharacterDetailsExplorer: FC = () => {
	const {
					characterId,
					character,
					isLoading,
					errorMessage,
				} = useCharacterInspection();

	useGroupsShellHistoryBackHeader({
		title: character?.name || `Character ${ characterId }`,
	});

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
			title="Could not load character"
			subTitle={ errorMessage }
		/>;
	}

	if (!character) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Character not found."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<InspectionInfoPanel
				title={ character.name }
				description={ buildCharacterInspectionDescription(character) }
				imageUrl={ character.imageUrl }
				imagePreview
				fields={ buildCharacterInspectionFields(character) }
			/>
			<CharacterMediaAppearancesSection medias={ character.medias }/>
			<CharacterVoiceActorsSection voiceActors={ character.voiceActors }/>
		</section>
	);
};

export default CharacterDetailsExplorer;
