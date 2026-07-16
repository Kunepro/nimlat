import type { KeyboardEvent } from "react";
import { memo } from "react";
import styles from "../TopBar.module.css";

interface TopBarTitleProps {
	onNavigate: () => void;
}

function TopBarTitleComponent({ onNavigate }: TopBarTitleProps) {
	const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}

		event.preventDefault();
		onNavigate();
	};

	return (
		<div
			role="button"
			tabIndex={ 0 }
			className={ styles.title }
			onClick={ onNavigate }
			onKeyDown={ handleKeyDown }
			aria-label="Go to Library"
		>
			Nimlat
		</div>
	);
}

export const TopBarTitle = memo(TopBarTitleComponent);
