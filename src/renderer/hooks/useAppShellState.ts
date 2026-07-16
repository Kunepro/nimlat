import {
	type BackgroundStyle,
	DEFAULT_BACKGROUND_STYLE,
} from "@nimlat/types/user-config";
import {
	useEffect,
	useState,
} from "react";
import { isRestorableRoute } from "../app-shell-model";
import {
	backgroundStyleChanges,
	loadBackgroundStyle,
	persistLastRoute,
} from "../app-shell-runner";

export function useAppShellState(routeHref: string): BackgroundStyle {
	const [ backgroundStyle, setBackgroundStyle ] = useState<BackgroundStyle>(DEFAULT_BACKGROUND_STYLE);

	useEffect(
		() => {
			if (!isRestorableRoute(routeHref)) {
				return undefined;
			}

			// Route persistence is delayed so fast redirect/transient router states do not
			// become the restart target. The cleanup owns the race when navigation changes.
			const timeoutId = window.setTimeout(
				() => {
					void persistLastRoute(routeHref);
				},
				250,
			);

			return () => window.clearTimeout(timeoutId);
		},
		[ routeHref ],
	);

	useEffect(
		() => {
			let cancelled = false;

			void loadBackgroundStyle()
				.then((style) => {
					if (!cancelled) {
						setBackgroundStyle(style);
					}
				})
				.catch(() => {
					if (!cancelled) {
						// Background preference is cosmetic; keep the default shell stable until a later config event arrives.
						setBackgroundStyle(DEFAULT_BACKGROUND_STYLE);
					}
				});

			const backgroundStyleSubscription = backgroundStyleChanges().subscribe((style) => {
				setBackgroundStyle(style);
			});

			return () => {
				cancelled = true;
				backgroundStyleSubscription.unsubscribe();
			};
		},
		[],
	);

	return backgroundStyle;
}
