import { TrackingStatusRadioGroup } from "@nimlat/components";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupInspectionMediaCard } from "@nimlat/types/ipc-payloads";
import type { MediaWallProjectorOverlayItem } from "../../../../types/media-wall";

interface GroupMediaGridProjectorOverlayProps {
	activeItem: MediaWallProjectorOverlayItem<GroupInspectionMediaCard>;
	onIntegrationStatusChange: (mediaId: number, nextStatus: IntegrationStatus | null) => Promise<void>;
}

export default function GroupMediaGridProjectorOverlay({
																												 activeItem,
																												 onIntegrationStatusChange,
																											 }: GroupMediaGridProjectorOverlayProps) {
	return (
		<TrackingStatusRadioGroup
			id={ `group-media-${ activeItem.item.mediaId }` }
			value={ activeItem.item.integrationStatus ?? null }
			onChange={ (nextStatus) => onIntegrationStatusChange(
				activeItem.item.mediaId,
				nextStatus,
			) }
		/>
	);
}
