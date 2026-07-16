import { HeaderActionProjector } from "@nimlat/components";
import type { IntegrationStatus } from "@nimlat/types/anime-db";
import type { GroupRef } from "@nimlat/types/nimlat-ids";

interface GroupHeaderTrackingProjectorProps {
	groupId: string;
	groupSource: string;
	groupRef: GroupRef | null;
	integrationStatus: IntegrationStatus | null | undefined;
	isUpdatingIntegrationStatus: boolean;
	onGroupIntegrationStatusChange: (nextIntegrationStatus: IntegrationStatus | null) => Promise<void>;
}

export default function GroupHeaderTrackingProjector({
																											 groupId,
																											 groupSource,
																											 groupRef,
																											 integrationStatus,
																											 isUpdatingIntegrationStatus,
																											 onGroupIntegrationStatusChange,
																										 }: GroupHeaderTrackingProjectorProps) {
	return (
		<HeaderActionProjector
			id={ `group-header-${ groupSource }-${ groupId }` }
			trackingStatus={ integrationStatus ?? null }
			isTrackingDisabled={ isUpdatingIntegrationStatus || !groupRef }
			onTrackingStatusChange={ onGroupIntegrationStatusChange }
		/>
	);
}
