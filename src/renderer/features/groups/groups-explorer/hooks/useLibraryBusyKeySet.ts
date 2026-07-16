import {
	useCallback,
	useMemo,
	useState,
} from "react";
import {
	appendUniqueKeys,
	removeKeys,
} from "../library-item-actions-model";

interface LibraryBusyKeySetController {
	keySet: Set<string>;
	addKeys: (keys: Iterable<string>) => void;
	removeKeys: (keys: ReadonlySet<string>) => void;
}

export function useLibraryBusyKeySet(): LibraryBusyKeySetController {
	const [ keys, setKeys ] = useState<string[]>([]);
	const keySet            = useMemo(
		() => new Set(keys),
		[ keys ],
	);
	const addKeys           = useCallback(
		(keysToAdd: Iterable<string>) => {
			setKeys(current => appendUniqueKeys(
				current,
				keysToAdd,
			));
		},
		[],
	);
	const removeBusyKeys    = useCallback(
		(keysToRemove: ReadonlySet<string>) => {
			setKeys(current => removeKeys(
				current,
				keysToRemove,
			));
		},
		[],
	);

	return {
		keySet,
		addKeys,
		removeKeys: removeBusyKeys,
	};
}
