import {
	useEffect,
	useRef,
} from "react";

// Async renderer flows use this to ignore late completions after a component unmounts.
export function useIsMountedRef() {
	const isMountedRef = useRef(false);

	useEffect(
		() => {
			isMountedRef.current = true;

			return () => {
				isMountedRef.current = false;
			};
		},
		[],
	);

	return isMountedRef;
}
