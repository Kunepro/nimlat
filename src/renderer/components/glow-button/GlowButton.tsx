import {
	ButtonHTMLAttributes,
	FC,
	PropsWithChildren,
} from "react";
import styles from "./GlowButton.module.css";

type GlowButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>>;

function joinClassNames(...classNames: Array<string | undefined>): string {
	return classNames.filter(Boolean).join(" ");
}

const GlowButton: FC<GlowButtonProps> = ({
																					 children,
																					 className,
																					 type = "button",
																					 ...props
																				 }) => {
	return (
		<button
			type={ type }
			className={ joinClassNames(
				styles.button,
				className,
			) }
			{ ...props }
		>
			{ children }
		</button>
	);
};

export default GlowButton;
