import type { BackgroundStyle } from "@nimlat/types/user-config";
import {
	FC,
	PropsWithChildren,
	useMemo,
	useRef,
} from "react";
import PixiBackgroundDiagnosticsOverlay from "./components/PixiBackgroundDiagnosticsOverlay";
import { usePixiBackgroundDiagnostics } from "./hooks/usePixiBackgroundDiagnostics";
import { usePixiBackgroundRenderer } from "./hooks/usePixiBackgroundRenderer";
import styles from "./PixiAppBackground.module.css";

interface PixiAppBackgroundProps extends PropsWithChildren {
	backgroundStyle: BackgroundStyle;
	className?: string;
}

function joinClassNames(...classNames: Array<string | undefined>): string {
	return classNames.filter(Boolean).join(" ");
}

const PixiAppBackground: FC<PixiAppBackgroundProps> = ({
																												 backgroundStyle,
																												 children,
																												 className,
																											 }) => {
	const canvasHostRef = useRef<HTMLDivElement | null>(null);
	const {
					diagnosticsEnabledRef,
					diagnosticsSnapshot,
					isDiagnosticsEnabled,
					publishDiagnosticsSnapshot,
				}             = usePixiBackgroundDiagnostics();

	const diagnostics = useMemo(
		() => ({
			diagnosticsEnabledRef,
			publishDiagnosticsSnapshot,
		}),
		[
			diagnosticsEnabledRef,
			publishDiagnosticsSnapshot,
		],
	);

	usePixiBackgroundRenderer({
		backgroundStyle,
		canvasHostRef,
		diagnostics,
	});

	return (
		<div
			className={ joinClassNames(
				styles.surface,
				className,
			) }
		>
			<div
				ref={ canvasHostRef }
				className={ styles.canvasLayer }
				aria-hidden="true"
			/>
			{ isDiagnosticsEnabled ? (
				<PixiBackgroundDiagnosticsOverlay snapshot={ diagnosticsSnapshot }/>
			) : null }
			<div className={ styles.content }>
				{ children }
			</div>
		</div>
	);
};

export default PixiAppBackground;
