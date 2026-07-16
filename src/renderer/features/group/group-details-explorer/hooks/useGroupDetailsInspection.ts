import type { GroupInspectionSummary } from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useCallback,
	useEffect,
	useState,
} from "react";
import {
	groupInspectionListChanges,
	loadGroupInspectionSummary,
} from "../../group-inspection-runner";
import { isGroupDetailsEventAffected } from "../group-details-explorer-model";

interface GroupDetailsInspectionController {
	group: GroupInspectionSummary | null;
	isLoading: boolean;
	errorMessage: string | null;
	refreshGroupInspection: (showLoader?: boolean) => Promise<void>;
	restoreGroupSnapshot: (snapshot: GroupInspectionSummary | null) => void;
	setAllMediaWatchedSnapshot: (nextWatched: boolean) => void;
}

export function useGroupDetailsInspection(groupRef: GroupRef | null): GroupDetailsInspectionController {
	const [ group, setGroup ]               = useState<GroupInspectionSummary | null>(null);
	const [ isLoading, setLoading ]         = useState(true);
	const [ errorMessage, setErrorMessage ] = useState<string | null>(null);

	const refreshGroupInspection = useCallback(
		async (showLoader: boolean = true) => {
			try {
				if (showLoader) {
					setLoading(true);
				}
				setErrorMessage(null);
				if (!groupRef) {
					throw new Error("Invalid group reference.");
				}
				setGroup(await loadGroupInspectionSummary(groupRef));
			} catch (error) {
				if (showLoader) {
					setErrorMessage(error instanceof Error ? error.message : "Failed to load group details.");
				}
			} finally {
				if (showLoader) {
					setLoading(false);
				}
			}
		},
		[ groupRef ],
	);

	useEffect(
		() => {
			void refreshGroupInspection(true);
		},
		[ refreshGroupInspection ],
	);

	useEffect(
		() => {
			const groupListSubscription = groupInspectionListChanges().subscribe((event) => {
				if (!isGroupDetailsEventAffected(
					groupRef,
					event.affectedGroups,
				)) {
					return;
				}
				void refreshGroupInspection(false);
			});

			return () => {
				groupListSubscription.unsubscribe();
			};
		},
		[
			groupRef,
			refreshGroupInspection,
		],
	);

	const restoreGroupSnapshot = useCallback(
		(snapshot: GroupInspectionSummary | null) => {
			setGroup(snapshot);
		},
		[],
	);

	const setAllMediaWatchedSnapshot = useCallback(
		(nextWatched: boolean) => {
			setGroup(current => current
				? {
					...current,
					watchedMediasCount: nextWatched ? current.mediasCount : 0,
				}
				: current);
		},
		[],
	);

	return {
		group,
		isLoading,
		errorMessage,
		refreshGroupInspection,
		restoreGroupSnapshot,
		setAllMediaWatchedSnapshot,
	};
}
