import type { IntegrationStatus } from "@nimlat/types/anime-db";
import {
	type FC,
	useMemo,
} from "react";
import CyberRadioButtons from "../cyber-radio-buttons/CyberRadioButtons";
import {
	createTrackingStatusRadioOptions,
	parseTrackingStatusRadioValue,
} from "./tracking-status-control-model";

interface TrackingStatusRadioGroupProps {
	id: string;
	value?: IntegrationStatus | null;
	disabled?: boolean;
	onChange: (value: IntegrationStatus | null) => void | Promise<void>;
}

const TrackingStatusRadioGroup: FC<TrackingStatusRadioGroupProps> = ({
																																			 id,
																																			 value,
																																			 disabled,
																																			 onChange,
																																		 }) => {
	const currentStatus = value ?? null;
	const options       = useMemo(
		() => createTrackingStatusRadioOptions({
			disabled,
			id,
			status: currentStatus,
		}),
		[
			currentStatus,
			disabled,
			id,
		],
	);

	// Ignore stays outside this group because it changes item visibility instead of tracking progress.
	return (
		<CyberRadioButtons
			name={ `tracking-status-${ id }` }
			options={ options }
			onChange={ (nextStatus) => {
				if (disabled) {
					return;
				}
				void onChange(parseTrackingStatusRadioValue(nextStatus));
			} }
		/>
	);
};

export default TrackingStatusRadioGroup;
