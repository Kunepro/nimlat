import type { VoiceActorInspectionData } from "@nimlat/types/ipc-payloads";
import { useRouteInspectionFeed } from "../../people/hooks/useRouteInspectionFeed";
import { getVoiceActorInspection } from "../../people/people-inspection-runner";

export function useVoiceActorInspection(): {
	voiceActorId: number;
	voiceActor: VoiceActorInspectionData | null;
	isLoading: boolean;
	errorMessage: string | null;
} {
	const feed = useRouteInspectionFeed<VoiceActorInspectionData>({
		fallbackErrorMessage: "Failed to load voice actor.",
		loadInspection:       getVoiceActorInspection,
		paramName:            "voiceActorId",
	});

	return {
		voiceActorId: feed.id,
		voiceActor:   feed.inspection,
		isLoading:    feed.isLoading,
		errorMessage: feed.errorMessage,
	};
}
