import {
	atom,
	useSetAtom,
} from "jotai";
import { useEffect } from "react";
import type { GroupsShellHeaderConfig } from "../../../types/groups-shell";

const defaultGroupsShellHeaderConfig: GroupsShellHeaderConfig = {
	title:          "Library",
	onBack:         () => {
		window.history.back();
	},
	isBackEnabled:  true,
	navigationIcon: "back",
};

// Shell header state is intentionally Jotai-backed. Project-owned React context
// providers are forbidden because broad context invalidation can rerender routed
// content that did not actually change.
export const groupsShellHeaderConfigAtom = atom<GroupsShellHeaderConfig>(defaultGroupsShellHeaderConfig);

// Keep page-level header configuration close to the consuming Group views while
// letting the shell own the actual header rendering.
export function useGroupsShellHeader(config: GroupsShellHeaderConfig): void {
	const setHeaderConfig = useSetAtom(groupsShellHeaderConfigAtom);
	const {
					isBackEnabled,
					centerContent,
					navigationIcon,
					onBack,
					rightContent,
					title,
				} = config;

	useEffect(
		() => {
			setHeaderConfig({
				title,
				onBack,
				isBackEnabled,
				navigationIcon,
				centerContent,
				rightContent,
			});
		},
		[
			centerContent,
			isBackEnabled,
			navigationIcon,
			onBack,
			rightContent,
			setHeaderConfig,
			title,
		],
	);
}

// The shell clears stale page-owned controls when routed content unmounts, while
// keeping the reset behavior named outside the layout component.
export function useResetGroupsShellHeaderOnUnmount(): void {
	const setHeaderConfig = useSetAtom(groupsShellHeaderConfigAtom);

	useEffect(
		() => () => {
			setHeaderConfig(defaultGroupsShellHeaderConfig);
		},
		[ setHeaderConfig ],
	);
}
