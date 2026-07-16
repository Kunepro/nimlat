import type {
	Dispatch,
	SetStateAction,
} from "react";
import { useEffect } from "react";
import {
	canvasDiagnosticsStatusChanges,
	loadCanvasDiagnosticsStatus,
	loadDevModeStatus,
} from "../canvas-diagnostics-runner";
import type {
	MediaWallDiagnosticsSnapshot,
	MediaWallRenderer,
	PixiMediaWallHostProps,
} from "../types/media-wall";

interface UsePixiMediaWallDiagnosticsProps<TItem> {
	diagnosticsMode: NonNullable<PixiMediaWallHostProps<TItem>["diagnosticsMode"]>;
	isDiagnosticsEnabled: boolean;
	renderer: MediaWallRenderer<TItem>;
	setDiagnosticsEnabled: Dispatch<SetStateAction<boolean>>;
	setDiagnosticsSnapshot: Dispatch<SetStateAction<MediaWallDiagnosticsSnapshot>>;
}

export function usePixiMediaWallDiagnostics<TItem>({
																										 diagnosticsMode,
																										 isDiagnosticsEnabled,
																										 renderer,
																										 setDiagnosticsEnabled,
																										 setDiagnosticsSnapshot,
																									 }: UsePixiMediaWallDiagnosticsProps<TItem>) {
	useEffect(
		() => {
			if (diagnosticsMode === "on") {
				setDiagnosticsEnabled(true);
				return undefined;
			}
			if (diagnosticsMode === "off") {
				setDiagnosticsEnabled(false);
				return undefined;
			}

			let cancelled                        = false;
			let unsubscribe: (() => void) | null = null;

			// Dev mode is the hard gate for the developer diagnostics overlay. When it is
			// off, avoid even subscribing to the canvas-diagnostics flag for each wall.
			void loadDevModeStatus()
				.then((isDevModeEnabled) => {
					if (cancelled || !isDevModeEnabled) {
						if (!cancelled) {
							setDiagnosticsEnabled(false);
						}
						return;
					}

					void loadCanvasDiagnosticsStatus()
						.then((enabled) => {
							if (!cancelled) {
								setDiagnosticsEnabled(enabled);
							}
						})
						.catch(() => {
							if (!cancelled) {
								setDiagnosticsEnabled(false);
							}
						});

					const subscription = canvasDiagnosticsStatusChanges().subscribe((enabled) => {
						if (!cancelled) {
							setDiagnosticsEnabled(enabled);
						}
					});
					unsubscribe        = () => subscription.unsubscribe();
				})
				.catch(() => {
					if (!cancelled) {
						setDiagnosticsEnabled(false);
					}
				});

			return () => {
				cancelled = true;
				unsubscribe?.();
			};
		},
		[
			diagnosticsMode,
			setDiagnosticsEnabled,
		],
	);

	useEffect(
		() => {
			renderer.setDiagnosticsEnabled(isDiagnosticsEnabled);
			renderer.render();
		},
		[
			isDiagnosticsEnabled,
			renderer,
		],
	);

	useEffect(
		() => {
			if (!isDiagnosticsEnabled) {
				return undefined;
			}

			const updateSnapshot = () => {
				setDiagnosticsSnapshot(renderer.getDiagnostics());
			};
			updateSnapshot();
			const intervalId = window.setInterval(
				updateSnapshot,
				250,
			);

			return () => window.clearInterval(intervalId);
		},
		[
			isDiagnosticsEnabled,
			renderer,
			setDiagnosticsSnapshot,
		],
	);
}
