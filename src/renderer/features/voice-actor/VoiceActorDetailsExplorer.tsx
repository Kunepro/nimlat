import { InspectionInfoPanel } from "@nimlat/components";
import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import { FC } from "react";
import styles from "../character/CharacterDetailsExplorer.module.css";
import { useGroupsShellHistoryBackHeader } from "../groups/groups-shell/use-groups-shell-history-back-header";
import VoiceActorCreditsSection from "./components/VoiceActorCreditsSection";
import { useVoiceActorInspection } from "./hooks/use-voice-actor-inspection";
import {
	buildVoiceActorInspectionDescription,
	buildVoiceActorInspectionFields,
} from "./voice-actor-details-explorer-model";

const VoiceActorDetailsExplorer: FC = () => {
	const {
					voiceActorId,
					voiceActor,
					isLoading,
					errorMessage,
				} = useVoiceActorInspection();

	useGroupsShellHistoryBackHeader({
		title: voiceActor?.name || `Voice actor ${ voiceActorId }`,
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
			title="Could not load voice actor"
			subTitle={ errorMessage }
		/>;
	}

	if (!voiceActor) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Voice actor not found."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<InspectionInfoPanel
				title={ voiceActor.name }
				description={ buildVoiceActorInspectionDescription(voiceActor) }
				imageUrl={ voiceActor.imageUrl }
				imagePreview
				fields={ buildVoiceActorInspectionFields(voiceActor) }
			/>
			<VoiceActorCreditsSection appearances={ voiceActor.appearances }/>
		</section>
	);
};

export default VoiceActorDetailsExplorer;
