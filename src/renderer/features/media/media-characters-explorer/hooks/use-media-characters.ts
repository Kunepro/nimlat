import type { MediaCharacterListItem } from "@nimlat/types/ipc-payloads";
import { useMediaRouteListFeed } from "../../hooks/useMediaRouteListFeed";
import { listMediaCharacters } from "../../media-people-runner";

export function useMediaCharacters(): {
	mediaId: number;
	characters: MediaCharacterListItem[];
	isLoading: boolean;
	errorMessage: string | null;
} {
	const feed = useMediaRouteListFeed<MediaCharacterListItem>({
		fallbackErrorMessage: "Failed to load media characters.",
		loadItems:            listMediaCharacters,
	});

	return {
		mediaId:      feed.mediaId,
		characters:   feed.items,
		isLoading:    feed.isLoading,
		errorMessage: feed.errorMessage,
	};
}
