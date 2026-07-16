import {
	CSSProperties,
	FC,
	useMemo,
} from "react";
import styles from "./WatchedCardOverlay.module.css";

type WatchedGlitchStyle = CSSProperties & Record<`--${ string }`, string>;

interface WatchedCardOverlayProps {
	orientation?: "portrait" | "landscape";
}

const WatchedCardOverlay: FC<WatchedCardOverlayProps> = ({
																													 orientation = "portrait",
																												 }) => {
	// Each mounted overlay gets its own phase so repeated cards do not flicker in lockstep.
	const glitchStyle = useMemo<WatchedGlitchStyle>(
		() => ({
			"--watched-red-delay": `${ -Math.random() * 1350 }ms`,
		}),
		[],
	);

	return (
		<div
			className={ `${ styles.overlay } ${ styles[ orientation ] }` }
			style={ glitchStyle }
			aria-hidden="true"
		>
			<div className={ styles.shader }/>
			<div className={ styles.redMark }>
				<span className={ `${ styles.redArm } ${ styles.redArmTopLeft }` }/>
				<span className={ `${ styles.redArm } ${ styles.redArmBottomRight }` }/>
				<span className={ `${ styles.redArm } ${ styles.redArmTopRight }` }/>
				<span className={ `${ styles.redArm } ${ styles.redArmBottomLeft }` }/>
			</div>
		</div>
	);
};

export default WatchedCardOverlay;
