import type { ErroredContentItem } from "@nimlat/types/ipc-payloads";
import { Tag } from "antd";
import type { FC } from "react";
import { buildErroredContentStatusChipsViewModel } from "../errored-content-status-chips-model";

interface ErroredContentStatusChipsProps {
	item: ErroredContentItem;
}

const ErroredContentStatusChips: FC<ErroredContentStatusChipsProps> = ({ item }) => {
	const viewModel = buildErroredContentStatusChipsViewModel(item);

	return (
		<>
			{ viewModel.shouldShowHiddenChip ? <Tag>Hidden</Tag> : null }
			<Tag color={ viewModel.statusColor }>{ viewModel.statusLabel }</Tag>
			<Tag color={ viewModel.actionHintColor }>
				{ viewModel.actionHintLabel }
			</Tag>
		</>
	);
};

export default ErroredContentStatusChips;
