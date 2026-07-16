import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useMemo,
	useRef,
} from "react";
import {
	createGroupMediaWallDataSource,
	mapGroupMediaCardToMediaWallItem,
	PixiMediaWallRenderer,
} from "../../../../media-wall";
import {
	applyGroupMediaWatchOverride,
	createGroupMediaVisualStateKey,
	getGroupMediaMenuActions,
	getGroupMediaMenuMeta,
} from "../group-media-grid-model";

interface GroupMediaWallRendererState {
	dataSource: ReturnType<typeof createGroupMediaWallDataSource>;
	renderer: PixiMediaWallRenderer<GroupInspectionMediaCard>;
	visualStateKey: string;
}

// Keep Pixi renderer identity stable. It reads watch overrides through a ref so
// optimistic watched-state toggles update cards without dropping renderer caches.
export function useGroupMediaWallRenderer(
	group: GroupRef,
	watchStateOverrides: ReadonlyMap<number, boolean>,
): GroupMediaWallRendererState {
	const watchStateOverridesRef   = useRef(watchStateOverrides);
	watchStateOverridesRef.current = watchStateOverrides;

	const dataSource     = useMemo(
		() => createGroupMediaWallDataSource(group),
		[ group ],
	);
	const renderer       = useMemo(
		() => new PixiMediaWallRenderer<GroupInspectionMediaCard>({
			mapItem: (media) => {
				const effectiveMedia = applyGroupMediaWatchOverride(
					media,
					watchStateOverridesRef.current,
				);
				return {
					...mapGroupMediaCardToMediaWallItem(effectiveMedia),
					menuActions: getGroupMediaMenuActions(effectiveMedia),
					menuMeta:    getGroupMediaMenuMeta(effectiveMedia),
				};
			},
		}),
		[],
	);
	const visualStateKey = useMemo(
		() => createGroupMediaVisualStateKey(watchStateOverrides),
		[ watchStateOverrides ],
	);

	return {
		dataSource,
		renderer,
		visualStateKey,
	};
}
