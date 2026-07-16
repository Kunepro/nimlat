import type {
	GroupInspectionMediaCard,
	GroupMediaItemsPatchedEvent,
} from "@nimlat/types/ipc-payloads";
import type { GroupRef } from "@nimlat/types/nimlat-ids";
import {
	useCallback,
	useEffect,
	useState,
} from "react";
import {
	resolveGroupMediaPreviousWatchState,
	restoreGroupMediaWatchOverride,
	setGroupMediaWatchOverride,
} from "../group-media-explorer-model";
import { persistGroupMediaWatchState } from "../group-media-mutations-runner";

interface GroupMediaWatchStateMutationOptions {
	groupRef: GroupRef | null;
	notifyGroupMutationError: (errorMessage: string) => void;
	requestWallReload: (showInitialLoader?: boolean) => void;
}

interface GroupMediaWatchStateMutationController {
	watchStateOverrides: ReadonlyMap<number, boolean>;
	applyWatchStatePatches: (patches: GroupMediaItemsPatchedEvent["patches"]) => void;
	handleWatchStateChange: (media: GroupInspectionMediaCard, nextWatched: boolean) => Promise<void>;
}

export function useGroupMediaWatchStateMutation({
																									groupRef,
																									notifyGroupMutationError,
																									requestWallReload,
																								}: GroupMediaWatchStateMutationOptions): GroupMediaWatchStateMutationController {
	// Pixi wall items reload asynchronously; this override gives immediate watched-state
	// feedback while the DB-backed range read catches up.
	const [ watchStateOverrides, setWatchStateOverrides ] = useState<Map<number, boolean>>(() => new Map());

	useEffect(
		() => {
			setWatchStateOverrides(new Map());
		},
		[ groupRef ],
	);

	const applyWatchStatePatches = useCallback(
		(patches: GroupMediaItemsPatchedEvent["patches"]) => {
			setWatchStateOverrides((current) => {
				let next: Map<number, boolean> | null = null;
				patches.forEach((patch) => {
					if (typeof patch.isWatched !== "boolean" || current.get(patch.mediaId) === patch.isWatched) {
						return;
					}
					next ??= new Map(current);
					next.set(
						patch.mediaId,
						patch.isWatched,
					);
				});
				return next ?? current;
			});
		},
		[],
	);

	const handleWatchStateChange = useCallback(
		async (media: GroupInspectionMediaCard, nextWatched: boolean) => {
			const previousWatched = resolveGroupMediaPreviousWatchState(
				media,
				watchStateOverrides,
			);
			setWatchStateOverrides(current => setGroupMediaWatchOverride(
				current,
				media.mediaId,
				nextWatched,
			));
			try {
				const result = await persistGroupMediaWatchState(
					media.mediaId,
					nextWatched,
				);
				if (!result.success) {
					throw new Error(result.error);
				}
				requestWallReload();
			} catch (error) {
				setWatchStateOverrides(current => restoreGroupMediaWatchOverride(
					current,
					media.mediaId,
					nextWatched,
					previousWatched,
				));
				notifyGroupMutationError(error instanceof Error ? error.message : "Failed to update watched state.");
			}
		},
		[
			notifyGroupMutationError,
			requestWallReload,
			watchStateOverrides,
		],
	);

	return {
		watchStateOverrides,
		applyWatchStatePatches,
		handleWatchStateChange,
	};
}
