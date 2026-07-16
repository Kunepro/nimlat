import {
	useLocation,
	useNavigate,
} from "@tanstack/react-router";
import {
	useCallback,
	useEffect,
	useMemo,
} from "react";
import { ROUTES } from "../../../constants/route-config";
import {
	createMediaBackNavigationTarget,
	createMediaDetailsRedirectTarget,
	createMediaTabItems,
	createMediaTabNavigationTarget,
	type MediaTabItem,
	type MediaTabKey,
	resolveMediaLayoutRouteContext,
	resolveMediaTabKeyFromPathname,
	resolveVisibleMediaTabKey,
} from "../media-layout-model";

interface UseMediaLayoutNavigationInput {
	groupId?: string;
	groupName?: string;
	groupSource?: string;
	hasEpisodesTab: boolean;
	mediaId: string;
}

interface MediaLayoutNavigationController {
	handleTabChange: (key: string) => void;
	onBack: () => void;
	tabItems: MediaTabItem[];
	visibleActiveKey: MediaTabKey;
}

// Owns URL-derived tab state and navigation targets for both grouped and
// standalone media routes. The component should not know route string details.
export function useMediaLayoutNavigation({
																					 groupId,
																					 groupName,
																					 groupSource,
																					 hasEpisodesTab,
																					 mediaId,
																				 }: UseMediaLayoutNavigationInput): MediaLayoutNavigationController {
	const { pathname }     = useLocation();
	const navigate         = useNavigate();
	const routeContext     = useMemo(
		() => resolveMediaLayoutRouteContext({
			groupId,
			groupSource,
			mediaId,
		}),
		[
			groupId,
			groupSource,
			mediaId,
		],
	);
	const activeKey        = useMemo(
		() => resolveMediaTabKeyFromPathname(pathname),
		[ pathname ],
	);
	const visibleActiveKey = useMemo(
		() => resolveVisibleMediaTabKey(
			activeKey,
			hasEpisodesTab,
		),
		[
			activeKey,
			hasEpisodesTab,
		],
	);
	const tabItems         = useMemo(
		() => createMediaTabItems(hasEpisodesTab),
		[ hasEpisodesTab ],
	);

	useEffect(
		() => {
			if (hasEpisodesTab || activeKey !== ROUTES.GROUPS.MEDIA.EPISODES) {
				return;
			}

			void navigate({
				...createMediaDetailsRedirectTarget(routeContext),
			});
		},
		[
			activeKey,
			hasEpisodesTab,
			navigate,
			routeContext,
		],
	);

	const onBack = useCallback(
		() => {
			void navigate(createMediaBackNavigationTarget(
				routeContext,
				groupName,
			));
		},
		[
			groupName,
			navigate,
			routeContext,
		],
	);

	const handleTabChange = useCallback(
		(key: string) => {
			void navigate(createMediaTabNavigationTarget(
				routeContext,
				key,
			));
		},
		[
			navigate,
			routeContext,
		],
	);

	return {
		handleTabChange,
		onBack,
		tabItems,
		visibleActiveKey,
	};
}
