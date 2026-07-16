import type { FC } from "react";
import React from "react";
import styles from "../GroupMediaExplorer.module.css";

interface GroupMediaRemoveUndoButtonProps {
	durationSeconds: number;
	onUndo: () => void;
}

const GroupMediaRemoveUndoButton: FC<GroupMediaRemoveUndoButtonProps> = ({
																																					 durationSeconds,
																																					 onUndo,
																																				 }) => (
	<button
		type="button"
		className={ styles.undoToastButton }
		onClick={ onUndo }
	>
		<svg
			className={ styles.undoToastProgress }
			viewBox="0 0 20 20"
			aria-hidden="true"
			style={ {
				"--undo-duration": `${ durationSeconds }s`,
			} as React.CSSProperties }
		>
			<circle
				className={ styles.undoToastProgressTrack }
				cx="10"
				cy="10"
				r="7"
			/>
			<circle
				className={ styles.undoToastProgressValue }
				cx="10"
				cy="10"
				r="7"
			/>
		</svg>
		<span>Undo</span>
	</button>
);

export default GroupMediaRemoveUndoButton;
