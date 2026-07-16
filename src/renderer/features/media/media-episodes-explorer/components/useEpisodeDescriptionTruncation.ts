import {
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from "react";

interface EpisodeDescriptionTruncationState {
	descriptionRef: RefObject<HTMLDivElement | null>;
	isTruncated: boolean;
}

export function useEpisodeDescriptionTruncation(text: string): EpisodeDescriptionTruncationState {
	const descriptionRef                  = useRef<HTMLDivElement | null>(null);
	const [ isTruncated, setIsTruncated ] = useState(false);

	useLayoutEffect(
		() => {
			const element = descriptionRef.current;
			if (!element) {
				setIsTruncated(false);
				return;
			}

			let frameId: number | null = null;
			const updateTruncation     = () => {
				frameId               = null;
				const nextIsTruncated = element.scrollHeight > element.clientHeight + 1
					|| element.scrollWidth > element.clientWidth + 1;
				setIsTruncated(nextIsTruncated);
			};
			const scheduleUpdate       = () => {
				if (frameId != null) {
					cancelAnimationFrame(frameId);
				}
				frameId = requestAnimationFrame(updateTruncation);
			};

			scheduleUpdate();

			if (typeof ResizeObserver === "undefined") {
				window.addEventListener(
					"resize",
					scheduleUpdate,
				);
				return () => {
					window.removeEventListener(
						"resize",
						scheduleUpdate,
					);
					if (frameId != null) {
						cancelAnimationFrame(frameId);
					}
				};
			}

			const resizeObserver = new ResizeObserver(scheduleUpdate);
			resizeObserver.observe(element);

			return () => {
				resizeObserver.disconnect();
				if (frameId != null) {
					cancelAnimationFrame(frameId);
				}
			};
		},
		[ text ],
	);

	return {
		descriptionRef,
		isTruncated,
	};
}
