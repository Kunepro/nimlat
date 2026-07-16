import { useParams } from "@tanstack/react-router";
import type {
	MediaTabItem,
	MediaTabKey,
} from "../media-layout-model";
import { useMediaLayoutState } from "./use-media-layout-state";
import { useMediaLayoutHeader } from "./useMediaLayoutHeader";
import { useMediaLayoutNavigation } from "./useMediaLayoutNavigation";

interface MediaLayoutController {
	handleTabChange: (key: string) => void;
	tabItems: MediaTabItem[];
	visibleActiveKey: MediaTabKey;
}

// Thin page controller: DB-backed header state, route navigation, and shell
// header wiring each live in focused hooks instead of the route component.
export function useMediaLayoutController(): MediaLayoutController {
	const {
					groupId,
					groupSource,
					mediaId = "",
				}           = useParams({ strict: false });
	const layoutState = useMediaLayoutState(mediaId);
	const {
					handleTabChange,
					onBack,
					tabItems,
					visibleActiveKey,
				}           = useMediaLayoutNavigation({
		groupId,
		groupName:      layoutState.groupName,
		groupSource,
		hasEpisodesTab: layoutState.hasEpisodesTab,
		mediaId,
	});

	useMediaLayoutHeader({
		...layoutState,
		mediaId,
		onBack,
	});

	return {
		handleTabChange,
		tabItems,
		visibleActiveKey,
	};
}
