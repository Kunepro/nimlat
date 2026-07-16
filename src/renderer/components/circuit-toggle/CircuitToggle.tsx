import { FC } from "react";
import styles from "./CircuitToggle.module.css";

interface CircuitToggleProps {
	checked: boolean;
	onChange: (checked: boolean) => void;
	ariaLabel: string;
	label?: string;
	disabled?: boolean;
	readOnly?: boolean;
	className?: string;
	size?: "compact" | "regular";
}

const CircuitToggle: FC<CircuitToggleProps> = ({
																								 checked,
																								 onChange,
																								 ariaLabel,
																								 label,
																								 disabled = false,
																								 readOnly = false,
																								 className = "",
																								 size = "regular",
																							 }) => (
	<button
		type="button"
		role="switch"
		aria-checked={ checked }
		aria-label={ ariaLabel }
		aria-readonly={ readOnly }
		disabled={ disabled }
		className={ [
			styles.circuitToggle,
			checked ? styles.checked : "",
			label ? styles.withLabel : "",
			size === "compact" ? styles.compact : "",
			readOnly ? styles.readOnly : "",
			className,
		].filter(Boolean).join(" ") }
		onClick={ (event) => {
			if (readOnly) {
				event.preventDefault();
				event.stopPropagation();
				return;
			}
			onChange(!checked);
		} }
	>
		<span
			className={ styles.board }
			aria-hidden="true"
		>
			<span className={ styles.traceLeft }/>
			<span className={ styles.traceRight }/>
			<span className={ styles.nodeLeft }/>
			<span className={ styles.nodeRight }/>
			<span className={ styles.bridge }/>
			<span className={ styles.spark }/>
		</span>
		{ label ? <span className={ styles.label }>{ label }</span> : null }
	</button>
);

export default CircuitToggle;
