import { useParams } from "@tanstack/react-router";
import {
	useEffect,
	useMemo,
	useState,
} from "react";

interface UseMediaRouteListFeedInput<TItem> {
	fallbackErrorMessage: string;
	loadItems: (mediaId: number) => Promise<TItem[]>;
}

interface MediaRouteListFeed<TItem> {
	errorMessage: string | null;
	isLoading: boolean;
	items: TItem[];
	mediaId: number;
}

function formatRouteListFeedLoadError(
	error: unknown,
	fallbackErrorMessage: string,
): string {
	return error instanceof Error && error.message
		? error.message
		: fallbackErrorMessage;
}

// Shared lifecycle for route-scoped read-only Media sublists. The stale guard
// keeps late IPC responses from an old route from replacing the active screen.
export function useMediaRouteListFeed<TItem>({
																							 fallbackErrorMessage,
																							 loadItems,
																						 }: UseMediaRouteListFeedInput<TItem>): MediaRouteListFeed<TItem> {
	const { mediaId = "" }                  = useParams({ strict: false });
	const numericMediaId                    = useMemo(
		() => Number(mediaId),
		[ mediaId ],
	);
	const [ items, setItems ]               = useState<TItem[]>([]);
	const [ isLoading, setLoading ]         = useState(true);
	const [ errorMessage, setErrorMessage ] = useState<string | null>(null);

	useEffect(
		() => {
			let isActive = true;
			void (async () => {
				try {
					setLoading(true);
					setErrorMessage(null);
					const nextItems = await loadItems(numericMediaId);
					if (!isActive) {
						return;
					}
					setItems(nextItems);
				} catch (error) {
					if (isActive) {
						setErrorMessage(formatRouteListFeedLoadError(
							error,
							fallbackErrorMessage,
						));
					}
				} finally {
					if (isActive) {
						setLoading(false);
					}
				}
			})();

			return () => {
				isActive = false;
			};
		},
		[
			fallbackErrorMessage,
			loadItems,
			numericMediaId,
		],
	);

	return {
		errorMessage,
		isLoading,
		items,
		mediaId: numericMediaId,
	};
}
