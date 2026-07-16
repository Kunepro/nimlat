import {
	useCallback,
	useMemo,
	useState,
} from "react";
import {
	appendUniqueEpisodeNumbers,
	removeEpisodeNumbers,
	toEpisodeNumberSet,
} from "../media-episodes-explorer-model";

interface EpisodeNumberBusySetController {
	episodeNumberSet: ReadonlySet<number>;
	addEpisodeNumbers: (episodeNumbers: readonly number[]) => void;
	removeEpisodeNumbers: (episodeNumbers: readonly number[]) => void;
}

export function useEpisodeNumberBusySet(): EpisodeNumberBusySetController {
	const [ episodeNumbers, setEpisodeNumbers ] = useState<number[]>([]);
	const episodeNumberSet                      = useMemo(
		() => toEpisodeNumberSet(episodeNumbers),
		[ episodeNumbers ],
	);
	const addEpisodeNumbers                     = useCallback(
		(episodeNumbersToAdd: readonly number[]) => {
			setEpisodeNumbers(current => appendUniqueEpisodeNumbers(
				current,
				episodeNumbersToAdd,
			));
		},
		[],
	);
	const removeBusyEpisodeNumbers              = useCallback(
		(episodeNumbersToRemove: readonly number[]) => {
			setEpisodeNumbers(current => removeEpisodeNumbers(
				current,
				episodeNumbersToRemove,
			));
		},
		[],
	);

	return {
		episodeNumberSet,
		addEpisodeNumbers,
		removeEpisodeNumbers: removeBusyEpisodeNumbers,
	};
}
