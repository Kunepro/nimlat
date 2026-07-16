import type { ReactNode } from "react";

export type GroupsShellHeaderNavigationIcon = "back" | "home";

export interface GroupsShellHeaderConfig {
	title: string;
	onBack: () => void;
	isBackEnabled?: boolean;
	navigationIcon?: GroupsShellHeaderNavigationIcon;
	centerContent?: ReactNode;
	rightContent?: ReactNode;
}
