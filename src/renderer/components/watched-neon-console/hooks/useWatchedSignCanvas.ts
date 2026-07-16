import {
	useEffect,
	useRef,
} from "react";
import type { WatchedNeonConsoleStatus } from "../watched-neon-console-model";
import {
	drawWatchedSign,
	loadWatchedSignFont,
} from "../watched-neon-sign-canvas";

export function useWatchedSignCanvas(
	status: WatchedNeonConsoleStatus,
	connected: boolean,
) {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(
		() => {
			const canvas = canvasRef.current;
			if (!canvas) {
				return undefined;
			}
			let animationFrame = 0;
			let isDisposed     = false;
			const draw         = (timeMs: number) => {
				if (isDisposed) {
					return;
				}
				drawWatchedSign(
					canvas,
					connected,
					timeMs,
				);
				if (connected) {
					animationFrame = window.requestAnimationFrame(draw);
				}
			};
			draw(performance.now());
			void loadWatchedSignFont()?.then(() => {
				if (isDisposed) {
					return;
				}
				draw(performance.now());
			});
			return () => {
				isDisposed = true;
				window.cancelAnimationFrame(animationFrame);
			};
		},
		[
			connected,
			status,
		],
	);

	return canvasRef;
}
