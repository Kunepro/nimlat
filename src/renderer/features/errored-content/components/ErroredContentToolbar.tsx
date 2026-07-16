import {
	EyeInvisibleOutlined,
	EyeOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import {
	Button,
	Input,
	Select,
	Tooltip,
} from "antd";
import { FC } from "react";
import type { QueueFilter } from "../../../types/errored-content";
import { QUEUE_OPTIONS } from "../errored-content.constants";
import styles from "../ErroredContent.module.css";

interface ErroredContentToolbarProps {
	filter: QueueFilter;
	search: string;
	showHidden: boolean;
	isRetryingAll: boolean;
	isRetryAllDisabled: boolean;
	onFilterChange: (filter: QueueFilter) => void;
	onSearchChange: (search: string) => void;
	onToggleShowHidden: () => void;
	onRetryAll: () => void;
}

const ErroredContentToolbar: FC<ErroredContentToolbarProps> = ({
																																 filter,
																																 search,
																																 showHidden,
																																 isRetryingAll,
																																 isRetryAllDisabled,
																																 onFilterChange,
																																 onSearchChange,
																																 onToggleShowHidden,
																																 onRetryAll,
																															 }) => (
	<div className={ styles.toolbar }>
		<Select<QueueFilter>
			value={ filter }
			options={ QUEUE_OPTIONS }
			onChange={ onFilterChange }
			className={ styles.filter }
			aria-label="Errored content queue filter"
		/>
		<Input.Search
			value={ search }
			onChange={ event => onSearchChange(event.target.value) }
			allowClear
			className={ styles.search }
			placeholder="Search by anime name"
			aria-label="Search errored content by anime name"
		/>
		<div className={ styles.toolbarActions }>
			<Tooltip title={ showHidden ? "Hide hidden items" : "Show hidden items" }>
				<Button
					aria-label={ showHidden ? "Hide hidden items" : "Show hidden items" }
					icon={ showHidden ? <EyeInvisibleOutlined/> : <EyeOutlined/> }
					onClick={ onToggleShowHidden }
				/>
			</Tooltip>
			<Button
				type="primary"
				icon={ <ReloadOutlined/> }
				onClick={ onRetryAll }
				loading={ isRetryingAll }
				disabled={ isRetryAllDisabled }
			>
				Retry All
			</Button>
		</div>
	</div>
);

export default ErroredContentToolbar;
