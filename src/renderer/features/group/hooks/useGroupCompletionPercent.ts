import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useEffect,
	useMemo,
	useState,
} from "react";
import {
	type GroupCompletionSource,
	resolveGroupCompletionPercent,
} from "../group-completion-header-model";
import { loadGroupInspectionSummary } from "../group-inspection-runner";

interface GroupCompletionPercentOptions {
	group?: GroupCompletionSource | null;
	groupRef: GroupRef | null;
}

export function useGroupCompletionPercent({
																						group,
																						groupRef,
																					}: GroupCompletionPercentOptions): number | null {
	const [ fetchedGroup, setFetchedGroup ] = useState<GroupInspectionSummary | null>(null);

	useEffect(
		() => {
			if (group || !groupRef) {
				setFetchedGroup(null);
				return undefined;
			}

			let isCancelled = false;
			void (async () => {
				try {
					const nextGroup = await loadGroupInspectionSummary(groupRef);
					if (!isCancelled) {
						setFetchedGroup(nextGroup);
					}
				} catch {
					// Completion is supplemental header chrome; a failed snapshot must not block the route content.
					if (!isCancelled) {
						setFetchedGroup(null);
					}
				}
			})();

			return () => {
				isCancelled = true;
			};
		},
		[
			group,
			groupRef,
		],
	);

	return useMemo(
		() => resolveGroupCompletionPercent(group ?? fetchedGroup),
		[
			fetchedGroup,
			group,
		],
	);
}
