import type { GroupExplorerCard } from "@nimlat/types/ipc-payloads";
import {
	useEffect,
	useRef,
	useState,
} from "react";
import {
	useAppMessage,
	useIsMountedRef,
} from "../../../../hooks";
import { formatAddToGroupModalError } from "../add-to-group-modal-model";
import { loadAddToGroupTargetGroups } from "../library-item-actions-runner";

interface UseAddToGroupGroupsFeedInput {
	isOpen: boolean;
}

interface UseAddToGroupGroupsFeedResult {
	groups: GroupExplorerCard[];
	isLoadingGroups: boolean;
}

// The modal needs a complete target list, but page reads can outlive the modal.
// Request ids keep late completions from overwriting a newer open/close cycle.
export function useAddToGroupGroupsFeed({
																					isOpen,
																				}: UseAddToGroupGroupsFeedInput): UseAddToGroupGroupsFeedResult {
	const messageApi                              = useAppMessage();
	const [ groups, setGroups ]                   = useState<GroupExplorerCard[]>([]);
	const [ isLoadingGroups, setIsLoadingGroups ] = useState(false);
	const isMountedRef                            = useIsMountedRef();
	const groupsLoadRequestIdRef                  = useRef(0);

	useEffect(
		() => {
			if (!isOpen) {
				groupsLoadRequestIdRef.current += 1;
				return;
			}

			groupsLoadRequestIdRef.current += 1;
			const requestId = groupsLoadRequestIdRef.current;
			setIsLoadingGroups(true);
			void loadAddToGroupTargetGroups()
				.then((loadedGroups) => {
					if (isMountedRef.current && requestId === groupsLoadRequestIdRef.current) {
						setGroups(loadedGroups);
					}
				})
				.catch((error) => {
					if (isMountedRef.current && requestId === groupsLoadRequestIdRef.current) {
						messageApi.error(`Failed to load groups: ${ formatAddToGroupModalError(error) }`);
					}
				})
				.finally(() => {
					if (isMountedRef.current && requestId === groupsLoadRequestIdRef.current) {
						setIsLoadingGroups(false);
					}
				});
		},
		[
			isMountedRef,
			isOpen,
			messageApi,
		],
	);

	return {
		groups,
		isLoadingGroups,
	};
}
