import {
	type IntegrationStatusControlValue,
	NOT_TRACKED_INTEGRATION_STATUS_VALUE,
} from "@nimlat/constants/integration-status";

export const INTEGRATION_STATUS_OPTIONS = [
	{
		label: "Ignored",
		value: "ignored",
	},
	{
		label: "Not Tracked",
		value: NOT_TRACKED_INTEGRATION_STATUS_VALUE,
	},
	{
		label: "Tracked",
		value: "tracked",
	},
	{
		label: "Downloading",
		value: "downloading",
	},
	{
		label: "Downloaded",
		value: "downloaded",
	},
	{
		label: "Integrated",
		value: "integrated",
	},
] as const satisfies Array<{ label: string; value: IntegrationStatusControlValue }>;
