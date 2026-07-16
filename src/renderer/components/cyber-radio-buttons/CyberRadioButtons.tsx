import { FC } from "react";
import styles from "./CyberRadioButtons.module.css";

interface CyberRadioOption {
	id: string;
	value?: string;
	label: string;
	glitchText: string;
	number: string;
	prefixDecoration?: string;
	suffixDecoration?: string;
	down?: boolean;
	checked?: boolean;
	disabled?: boolean;
}

interface CyberRadioButtonsProps {
	name: string;
	options: CyberRadioOption[];
	onChange?: (value: string) => void;
}

const HEAVY_ROUND_TIPPED_RIGHT_ARROW = "\u279c";

function renderLabel(label: string, down?: boolean) {
	if (!down || !label.startsWith(HEAVY_ROUND_TIPPED_RIGHT_ARROW)) {
		return label;
	}

	return (
		<>
			<span
				className={ styles.downArrow }
				aria-hidden
			>
				{ HEAVY_ROUND_TIPPED_RIGHT_ARROW }
			</span>
			{ label.slice(HEAVY_ROUND_TIPPED_RIGHT_ARROW.length) }
		</>
	);
}

const CyberRadioButtons: FC<CyberRadioButtonsProps> = ({
																												 name,
																												 options,
																												 onChange,
																											 }) => {
	return (
		<div
			className={ styles.cyberButtons }
			data-cyber-radio-buttons
		>
			{ options.map(({
											 id,
											 value,
											 label,
											 glitchText,
											 number,
											 prefixDecoration,
											 suffixDecoration,
											 down,
											 checked,
											 disabled,
										 }) => (
				<div
					className={ styles.radioWrapper }
					data-cyber-radio-wrapper
					key={ id }
				>
					<input
						className={ styles.input }
						name={ name }
						id={ id }
						type="radio"
						disabled={ disabled }
						{ ...(onChange
							? {
								checked:  Boolean(checked),
								onChange: () => {
									onChange(value ?? id);
								},
							}
							: { defaultChecked: checked }) }
					/>
					<div
						className={ styles.button }
						data-cyber-radio-button
					>
						{ prefixDecoration ? (
							<span aria-hidden>{ prefixDecoration }</span>
						) : null }
						<span
							className={ styles.buttonLabel }
							data-cyber-radio-label
						>{ renderLabel(
							label,
							down,
						) }</span>
						{ suffixDecoration ? (
							<span aria-hidden>{ suffixDecoration }</span>
						) : null }
						<span
							className={ styles.buttonGlitch }
							aria-hidden
						>
							{ glitchText }
						</span>
						<label
							className={ styles.number }
							data-cyber-radio-number
							htmlFor={ id }
						>
							{ number }
						</label>
					</div>
				</div>
			)) }
		</div>
	);
};

export default CyberRadioButtons;
