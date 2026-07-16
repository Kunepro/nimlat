import type { MutableRefObject } from "react";
import {
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	canvasDiagnosticsStatusChanges,
	loadCanvasDiagnosticsStatus,
	loadDevModeStatus,
} from "../../../canvas-diagnostics-runner";
import type { BackgroundDiagnosticsSnapshot } from "../pixi-app-background-types";

interface PixiBackgroundDiagnosticsController {
	isDiagnosticsEnabled: boolean;
	diagnosticsEnabledRef: MutableRefObject<boolean>;
	diagnosticsSnapshot: BackgroundDiagnosticsSnapshot | null;
	clearDiagnosticsSnapshot: () => void;
	publishDiagnosticsSnapshot: (now: number, snapshot: BackgroundDiagnosticsSnapshot) => void;
}

export function usePixiBackgroundDiagnostics(): PixiBackgroundDiagnosticsController {
	const diagnosticsEnabledRef                           = useRef(false);
	const diagnosticsLastUpdateRef                        = useRef(0);
	const [ isDiagnosticsEnabled, setDiagnosticsEnabled ] = useState(false);
	const [ diagnosticsSnapshot, setDiagnosticsSnapshot ] = useState<BackgroundDiagnosticsSnapshot | null>(null);

	const clearDiagnosticsSnapshot = useCallback(
		() => {
			setDiagnosticsSnapshot(null);
		},
		[],
	);

	const publishDiagnosticsSnapshot = useCallback(
		(now: number, snapshot: BackgroundDiagnosticsSnapshot) => {
			if (!diagnosticsEnabledRef.current || now - diagnosticsLastUpdateRef.current < 250) {
				return;
			}
			diagnosticsLastUpdateRef.current = now;
			setDiagnosticsSnapshot(snapshot);
		},
		[],
	);

	useEffect(
		() => {
			let cancelled                        = false;
			let unsubscribe: (() => void) | null = null;

			// Diagnostics are gated by dev mode so normal users never keep the
			// diagnostic preference listener alive.
			void loadDevModeStatus()
				.then((isDevModeEnabled) => {
					if (cancelled || !isDevModeEnabled) {
						if (!cancelled) {
							diagnosticsEnabledRef.current = false;
							setDiagnosticsEnabled(false);
							clearDiagnosticsSnapshot();
						}
						return;
					}

					void loadCanvasDiagnosticsStatus()
						.then((enabled) => {
							if (cancelled) {
								return;
							}
							diagnosticsEnabledRef.current = enabled;
							setDiagnosticsEnabled(enabled);
						})
						.catch(() => {
						});

					const subscription = canvasDiagnosticsStatusChanges().subscribe((enabled) => {
						diagnosticsEnabledRef.current = enabled;
						setDiagnosticsEnabled(enabled);
						if (!enabled) {
							clearDiagnosticsSnapshot();
						}
					});
					unsubscribe        = () => subscription.unsubscribe();
				})
				.catch(() => {
				});

			return () => {
				cancelled = true;
				unsubscribe?.();
			};
		},
		[ clearDiagnosticsSnapshot ],
	);

	return {
		isDiagnosticsEnabled,
		diagnosticsEnabledRef,
		diagnosticsSnapshot,
		clearDiagnosticsSnapshot,
		publishDiagnosticsSnapshot,
	};
}
