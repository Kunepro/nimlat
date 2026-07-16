import { useParams } from "@tanstack/react-router";
import {
	useEffect,
	useState,
} from "react";

interface UseRouteInspectionFeedInput<TInspection> {
	fallbackErrorMessage: string;
	loadInspection: (id: number) => Promise<TInspection | null>;
	paramName: string;
}

interface RouteInspectionFeed<TInspection> {
	errorMessage: string | null;
	id: number;
	inspection: TInspection | null;
	isLoading: boolean;
}

function formatRouteInspectionError(
	error: unknown,
	fallbackErrorMessage: string,
): string {
	return error instanceof Error && error.message
		? error.message
		: fallbackErrorMessage;
}

// Shared lifecycle for route-scoped nullable inspection reads. Keeping the
// active flag here prevents stale route responses from updating unmounted views.
export function useRouteInspectionFeed<TInspection>({
																											fallbackErrorMessage,
																											loadInspection,
																											paramName,
																										}: UseRouteInspectionFeedInput<TInspection>): RouteInspectionFeed<TInspection> {
	const params                            = useParams({ strict: false }) as Record<string, string | undefined>;
	const numericId                         = Number(params[ paramName ] ?? "");
	const [ inspection, setInspection ]     = useState<TInspection | null>(null);
	const [ isLoading, setLoading ]         = useState(true);
	const [ errorMessage, setErrorMessage ] = useState<string | null>(null);

	useEffect(
		() => {
			let isActive = true;
			void (async () => {
				try {
					setLoading(true);
					setErrorMessage(null);
					const nextInspection = await loadInspection(numericId);
					if (isActive) {
						setInspection(nextInspection);
					}
				} catch (error) {
					if (isActive) {
						setErrorMessage(formatRouteInspectionError(
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
			loadInspection,
			numericId,
		],
	);

	return {
		errorMessage,
		id: numericId,
		inspection,
		isLoading,
	};
}
