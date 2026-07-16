import { TrackingStatusRadioGroup } from "@nimlat/components";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { LibraryDisplayItem } from "@nimlat/types/ipc-payloads";
import type { MediaWallProjectorOverlayItem } from "../../../../../types/media-wall";

interface LibraryGridProjectorOverlayProps {
	activeItem: MediaWallProjectorOverlayItem<LibraryDisplayItem>;
	updatingStatusKeys: ReadonlySet<string>;
	onIntegrationStatusChange: (item: LibraryDisplayItem, nextStatus: IntegrationStatus | null) => Promise<void>;
}

export default function LibraryGridProjectorOverlay({
																											activeItem,
																											updatingStatusKeys,
																											onIntegrationStatusChange,
																										}: LibraryGridProjectorOverlayProps) {
	return (
		<TrackingStatusRadioGroup
			id={ `library-${ activeItem.item.key }` }
			value={ activeItem.item.integrationStatus ?? null }
			disabled={ updatingStatusKeys.has(activeItem.item.key) }
			onChange={ (nextStatus) => onIntegrationStatusChange(
				activeItem.item,
				nextStatus,
			) }
		/>
	);
}
