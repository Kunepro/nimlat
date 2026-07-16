import type { MediaStaffListItem } from "@nimlat/types/ipc-payloads";
import { useMediaRouteListFeed } from "../../hooks/useMediaRouteListFeed";
import { listMediaStaff } from "../../media-people-runner";

export function useMediaStaff(): {
	mediaId: number;
	staff: MediaStaffListItem[];
	isLoading: boolean;
	errorMessage: string | null;
} {
	const feed = useMediaRouteListFeed<MediaStaffListItem>({
		fallbackErrorMessage: "Failed to load media staff.",
		loadItems:            listMediaStaff,
	});

	return {
		mediaId:      feed.mediaId,
		staff:        feed.items,
		isLoading:    feed.isLoading,
		errorMessage: feed.errorMessage,
	};
}
