import {
	Button,
	Tooltip,
} from "antd";
import type { ReactNode } from "react";

interface TopBarActionButtonProps {
	ariaLabel: string;
	className: string;
	icon: ReactNode;
	onClick: () => void;
	testId?: string;
	title: string;
}

export function TopBarActionButton({
																		 ariaLabel,
																		 className,
																		 icon,
																		 onClick,
																		 testId,
																		 title,
																	 }: TopBarActionButtonProps) {
	return (
		<Tooltip
			title={ title }
			mouseEnterDelay={ 1 }
			trigger={ [
				"hover",
				"focus",
			] }
		>
			<Button
				icon={ icon }
				onClick={ onClick }
				aria-label={ ariaLabel }
				className={ className }
				data-testid={ testId }
			/>
		</Tooltip>
	);
}
