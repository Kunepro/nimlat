import { memo } from "react";
import { useWatchedSignCanvas } from "./hooks/useWatchedSignCanvas";
import type { WatchedNeonConsoleStatus } from "./watched-neon-console-model";
import styles from "./WatchedNeonConsole.module.css";

interface PowerCableInteractionProps {
	status: WatchedNeonConsoleStatus;
	connected: boolean;
	disabled: boolean;
	loading: boolean;
	showStatusLabel: boolean;
	ariaLabel: string;
	onConnect: () => void;
	onDisconnect: () => void;
}

const PowerCableInteraction = memo(function PowerCableInteraction({
																																		status,
																																		connected,
																																		disabled,
																																		loading,
																																		showStatusLabel,
																																		ariaLabel,
																																		onConnect,
																																		onDisconnect,
																																	}: PowerCableInteractionProps) {
	const unavailable = disabled || loading;
	const canvasRef = useWatchedSignCanvas(
		status,
		connected,
	);

	return (
		<label
			className={ `${ styles.powerControl } ${ connected
				? styles.powerControlOn
				: styles.powerControlOff } ${ unavailable ? styles.powerControlDisabled : "" }` }
			aria-label={ ariaLabel }
		>
			<input
				type="checkbox"
				className={ styles.powerInput }
				checked={ connected }
				disabled={ unavailable }
				aria-label={ ariaLabel }
				aria-busy={ loading }
				onChange={ () => {
					if (connected) {
						onDisconnect();
						return;
					}
					onConnect();
				} }
			/>
			<span
				className={ styles.powerButton }
				aria-hidden="true"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 49.548 49.549"
					className={ styles.powerIcon }
				>
					<path d="M30.203 4.387v4.385c7.653 2.332 13.238 9.451 13.238 17.857 0 10.293-8.373 18.667-18.667 18.667S6.106 36.922 6.106 26.629c0-8.405 5.585-15.525 13.238-17.857V4.387C9.323 6.835 1.855 15.866 1.855 26.629c0 12.639 10.281 22.92 22.919 22.92s22.92-10.281 22.92-22.92C47.694 15.865 40.224 6.835 30.203 4.387z"/>
					<path d="M24.776 27.225c-1.41 0-2.554-1.145-2.554-2.555V2.554C22.222 1.144 23.366 0 24.776 0s2.554 1.144 2.554 2.554V24.67c0 1.41-1.144 2.555-2.554 2.555z"/>
				</svg>
			</span>
			{ showStatusLabel ? (
				<span
					className={ styles.watchedSign }
					aria-hidden="true"
				>
					<canvas
						ref={ canvasRef }
						className={ styles.watchedCanvas }
						width={ 112 }
						height={ 24 }
					/>
				</span>
			) : null }
		</label>
	);
});

export default PowerCableInteraction;
