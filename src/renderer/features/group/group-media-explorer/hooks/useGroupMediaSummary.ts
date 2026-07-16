import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useCallback,
	useEffect,
	useState,
} from "react";
import { loadGroupInspectionSummary } from "../../group-inspection-runner";

interface GroupMediaSummaryController {
	group: GroupInspectionSummary | null;
	isLoadingSummary: boolean;
	summaryErrorMessage: string | null;
	loadSummary: (showLoader?: boolean) => Promise<void>;
}

export function useGroupMediaSummary(groupRef: GroupRef | null): GroupMediaSummaryController {
	const [ group, setGroup ]                             = useState<GroupInspectionSummary | null>(null);
	const [ isLoadingSummary, setLoadingSummary ]         = useState(true);
	const [ summaryErrorMessage, setSummaryErrorMessage ] = useState<string | null>(null);

	const loadSummary = useCallback(
		async (showLoader: boolean = true) => {
			try {
				if (showLoader) {
					setLoadingSummary(true);
				}
				setSummaryErrorMessage(null);
				if (!groupRef) {
					throw new Error("Invalid group reference.");
				}
				setGroup(await loadGroupInspectionSummary(groupRef));
			} catch (error) {
				if (showLoader) {
					setSummaryErrorMessage(error instanceof Error ? error.message : "Failed to load group summary.");
				}
			} finally {
				if (showLoader) {
					setLoadingSummary(false);
				}
			}
		},
		[ groupRef ],
	);

	useEffect(
		() => {
			// Initial route load only concerns the group summary; media range state is
			// reset by the composition controller because it also owns wall selection state.
			void loadSummary(true);
		},
		[ loadSummary ],
	);

	return {
		group,
		isLoadingSummary,
		summaryErrorMessage,
		loadSummary,
	};
}
