import type { MutableRefObject } from "react";
import {
	useCallback,
	useState,
} from "react";

interface UseEditModalAsyncActionResult {
	isRunning: boolean;
	runAction: (action: () => Promise<void>) => void;
}

// Edit modal save/reset actions can outlive the mounted modal. This helper keeps
// loading flags local while preventing late completions from updating unmounted UI.
export function useEditModalAsyncAction(
	isMountedRef: MutableRefObject<boolean>,
): UseEditModalAsyncActionResult {
	const [ isRunning, setRunning ] = useState(false);

	const runAction = useCallback(
		(action: () => Promise<void>) => {
			void (async () => {
				try {
					setRunning(true);
					await action();
				} finally {
					if (isMountedRef.current) {
						setRunning(false);
					}
				}
			})();
		},
		[ isMountedRef ],
	);

	return {
		isRunning,
		runAction,
	};
}
