import {
	InspectionInfoPanel,
	WatchedCardOverlay,
	WatchedNeonConsole,
} from "@nimlat/components";
import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupWatchedSummary } from "../group-details-explorer-model";

interface GroupDetailsInfoPanelProps {
	group: GroupInspectionSummary;
	watchedSummary: GroupWatchedSummary;
	isUpdatingWatchedState: boolean;
	onGroupWatchedToggle: () => void;
}

export function GroupDetailsInfoPanel({
																				group,
																				watchedSummary,
																				isUpdatingWatchedState,
																				onGroupWatchedToggle,
																			}: GroupDetailsInfoPanelProps) {
	return (
		<InspectionInfoPanel
			title={ group.name }
			description={ group.description }
			imageUrl={ group.displayImageUrl || group.imageUrl }
			bannerImageUrl={ group.displayBannerImageUrl || group.bannerImageUrl }
			imageOverlay={ watchedSummary.isComplete ? <WatchedCardOverlay/> : null }
			fields={ [
				{
					label: "Total titles",
					value: group.mediasCount.toString(),
				},
			] }
			panelAccessory={ (
				<WatchedNeonConsole
					status={ watchedSummary.status }
					checked={ watchedSummary.isComplete }
					loading={ isUpdatingWatchedState }
					disabled={ watchedSummary.mediasCount === 0 }
					showStatusLabel={ false }
					ariaLabel={ watchedSummary.isComplete
						? `Unplug watched state for ${ group.name }`
						: `Plug in watched state for ${ group.name }` }
					onToggle={ onGroupWatchedToggle }
				/>
			) }
		/>
	);
}
