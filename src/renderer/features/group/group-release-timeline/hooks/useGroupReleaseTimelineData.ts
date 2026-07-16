import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import type { GroupReleaseTimelineRow } from "@nimlat/types/release-watch";
import {
	useCallback,
	useEffect,
	useState,
} from "react";
import {
	loadGroupInspectionSummary,
	loadGroupReleaseTimeline,
} from "../../group-inspection-runner";

interface GroupReleaseTimelineDataController {
	group: GroupInspectionSummary | null;
	rows: GroupReleaseTimelineRow[];
	isLoading: boolean;
	errorMessage: string | null;
	patchGroupIntegrationStatus: (nextIntegrationStatus: GroupInspectionSummary["integrationStatus"]) => void;
}

export function useGroupReleaseTimelineData(groupRef: GroupRef | null): GroupReleaseTimelineDataController {
	const [ rows, setRows ]                 = useState<GroupReleaseTimelineRow[]>([]);
	const [ group, setGroup ]               = useState<GroupInspectionSummary | null>(null);
	const [ isLoading, setLoading ]         = useState(true);
	const [ errorMessage, setErrorMessage ] = useState<string | null>(null);

	const loadTimeline = useCallback(
		async () => {
			try {
				setLoading(true);
				setErrorMessage(null);
				if (!groupRef) {
					throw new Error("Invalid group reference.");
				}
				// Timeline owns its route, so it loads the group snapshot too; tab navigation
				// cannot rely on route state being present after refresh/deep-link entry.
				const [
								nextGroup,
								nextRows,
							] = await Promise.all([
					loadGroupInspectionSummary(groupRef),
					loadGroupReleaseTimeline(groupRef),
				]);
				setGroup(nextGroup);
				setRows(nextRows);
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : "Failed to load release timeline.");
			} finally {
				setLoading(false);
			}
		},
		[ groupRef ],
	);

	useEffect(
		() => {
			void loadTimeline();
		},
		[ loadTimeline ],
	);

	const patchGroupIntegrationStatus = useCallback(
		(nextIntegrationStatus: GroupInspectionSummary["integrationStatus"]) => {
			setGroup(current => current
				? {
					...current,
					integrationStatus: nextIntegrationStatus,
				}
				: current);
		},
		[],
	);

	return {
		group,
		rows,
		isLoading,
		errorMessage,
		patchGroupIntegrationStatus,
	};
}
