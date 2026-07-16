import type { CharacterInspectionData } from "@nimlat/types/ipc-payloads";
import { useRouteInspectionFeed } from "../../people/hooks/useRouteInspectionFeed";
import { getCharacterInspection } from "../../people/people-inspection-runner";

export function useCharacterInspection(): {
	characterId: number;
	character: CharacterInspectionData | null;
	isLoading: boolean;
	errorMessage: string | null;
} {
	const feed = useRouteInspectionFeed<CharacterInspectionData>({
		fallbackErrorMessage: "Failed to load character.",
		loadInspection:       getCharacterInspection,
		paramName:            "characterId",
	});

	return {
		characterId:  feed.id,
		character:    feed.inspection,
		isLoading:    feed.isLoading,
		errorMessage: feed.errorMessage,
	};
}
