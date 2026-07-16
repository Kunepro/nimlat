import type { FC } from "react";
import type { BackgroundDiagnosticsSnapshot } from "../pixi-app-background-types";
import styles from "../PixiAppBackground.module.css";

interface PixiBackgroundDiagnosticsOverlayProps {
	snapshot: BackgroundDiagnosticsSnapshot | null;
}

const PixiBackgroundDiagnosticsOverlay: FC<PixiBackgroundDiagnosticsOverlayProps> = ({ snapshot }) => (
	<div className={ styles.diagnosticsOverlay }>
		{ snapshot ? (
			<>
				<div>BG { snapshot.style } / { snapshot.layer?.layerName ?? "unknown" }</div>
				<div>host { snapshot.hostWidth }x{ snapshot.hostHeight } renderer { snapshot.rendererWidth }x{ snapshot.rendererHeight } @{ snapshot.resolution }</div>
				<div>frame { snapshot.lastFrameMs.toFixed(1) }ms resizes { snapshot.resizeCount }</div>
				<div>objects { snapshot.layer?.objectCount ?? 0 } { snapshot.layer?.detail ?? "" }</div>
			</>
		) : (
			<div>BG diagnostics waiting</div>
		) }
	</div>
);

export default PixiBackgroundDiagnosticsOverlay;
