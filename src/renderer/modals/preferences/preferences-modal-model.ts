import type { MenuItemType } from "antd/es/menu/interface";

export type PreferenceSection = "general" | "tracking" | "download" | "app" | "developers";

export interface PreferenceMenuItem extends MenuItemType {
	key: PreferenceSection;
	label: string;
	type: "item";
}

export function buildPreferenceMenuItems(isDevModeEnabled: boolean): PreferenceMenuItem[] {
	return [
		{
			type:  "item",
			key:   "general",
			label: "General",
		},
		{
			type:  "item",
			key:   "tracking",
			label: "Watched",
		},
		{
			type:  "item",
			key:   "download",
			label: "Download",
		},
		{
			type:  "item",
			key:   "app",
			label: "About",
		},
		...(isDevModeEnabled
			? [
				{
					type:  "item" as const,
					key:   "developers" as const,
					label: "Developers",
				},
			]
			: []),
	];
}
