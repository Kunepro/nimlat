import type { HydratorProgressEvent } from "@nimlat/types/ipc-payloads";
import {
	useEffect,
	useRef,
	useState,
} from "react";
import {
	getHydratorProgressSnapshot,
	hydratorProgressChanges,
} from "../../../features/hydrator/hydrator-progress-runner";

export type HydratorProgressItem = HydratorProgressEvent & {
	isLeaving: boolean;
};

export const HYDRATOR_EVAPORATE_DURATION_MS = 2000;

export function upsertHydratorProgressItem(
	currentItems: HydratorProgressItem[],
	nextEvent: HydratorProgressEvent,
): HydratorProgressItem[] {
	const nextItems = currentItems.filter(item => item.taskId !== nextEvent.taskId);
	return nextItems.concat({
		...nextEvent,
		isLeaving: false,
	});
}

export function markHydratorProgressItemLeaving(
	currentItems: HydratorProgressItem[],
	taskId: string,
): HydratorProgressItem[] {
	return currentItems.map(item =>
		item.taskId === taskId
			? {
				...item,
				isLeaving: true,
			}
			: item,
	);
}

export function removeHydratorProgressItem(
	currentItems: HydratorProgressItem[],
	taskId: string,
): HydratorProgressItem[] {
	return currentItems.filter(item => item.taskId !== taskId);
}

function mapHydratorProgressSnapshot(snapshot: HydratorProgressEvent[]): HydratorProgressItem[] {
	return snapshot.map((event) => ({
		...event,
		isLeaving: false,
	}));
}

// Keeps animation lifecycle and IPC subscription orchestration out of the fixed
// indicator component, so the component remains a pure rendering shell.
export function useHydratorProgressItems(): HydratorProgressItem[] {
	const [ items, setItems ] = useState<HydratorProgressItem[]>([]);
	const removalTimeoutsRef  = useRef(new Map<string, ReturnType<typeof setTimeout>>());

	useEffect(
		() => {
			let isMounted         = true;
			const removalTimeouts = removalTimeoutsRef.current;

			void getHydratorProgressSnapshot()
				.then((snapshot) => {
					if (!isMounted || snapshot.length === 0) {
						return;
					}

					setItems(mapHydratorProgressSnapshot(snapshot));
				})
				.catch(() => undefined);

			const progressSubscription = hydratorProgressChanges().subscribe((event) => {
				const existingTimeout = removalTimeouts.get(event.taskId);
				if (existingTimeout) {
					clearTimeout(existingTimeout);
					removalTimeouts.delete(event.taskId);
				}

				setItems(currentItems => upsertHydratorProgressItem(
					currentItems,
					event,
				));

				if (event.status === "running") {
					return;
				}

				setItems(currentItems => markHydratorProgressItemLeaving(
					currentItems,
					event.taskId,
				));

				const removalTimeout = setTimeout(
					() => {
						setItems(currentItems => removeHydratorProgressItem(
							currentItems,
							event.taskId,
						));
						removalTimeouts.delete(event.taskId);
					},
					HYDRATOR_EVAPORATE_DURATION_MS,
				);
				removalTimeouts.set(
					event.taskId,
					removalTimeout,
				);
			});

			return () => {
				isMounted = false;
				progressSubscription.unsubscribe();
				removalTimeouts.forEach(timeout => clearTimeout(timeout));
				removalTimeouts.clear();
			};
		},
		[],
	);

	return items;
}
