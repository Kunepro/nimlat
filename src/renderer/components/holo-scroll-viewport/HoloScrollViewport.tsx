import {
	type FC,
	type ReactNode,
} from "react";
import styles from "./HoloScrollViewport.module.css";

interface HoloScrollViewportProps {
	children: ReactNode;
	className?: string;
	contentClassName?: string;
	variant?: "default" | "neon";
}

function joinClassNames(...classNames: Array<string | undefined>): string {
	return classNames.filter(Boolean).join(" ");
}

// The frame stays outside the scroll owner so virtual lists and Pixi canvases keep their own refs and input handling.
const HoloScrollViewport: FC<HoloScrollViewportProps> = ({
																													 children,
																													 className,
																													 contentClassName,
																													 variant = "default",
																												 }) => (
	<div
		className={ joinClassNames(
			styles.viewport,
			variant === "neon" ? styles.viewportNeon : undefined,
			className,
		) }
	>
		<div
			className={ styles.backplate }
			aria-hidden="true"
		/>
		<div
			className={ joinClassNames(
				styles.content,
				contentClassName,
			) }
		>
			{ children }
		</div>
		<div
			className={ styles.topOccluder }
			aria-hidden="true"
		/>
		<div
			className={ styles.bottomOccluder }
			aria-hidden="true"
		/>
		<div
			className={ styles.sideRails }
			aria-hidden="true"
		/>
	</div>
);

export default HoloScrollViewport;
