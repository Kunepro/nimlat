import type { ReleaseWatchScopeFilter } from "@nimlat/types/release-watch";
import {
	Button,
	Select,
} from "antd";
import type { FC } from "react";
import { SCOPE_FILTER_OPTIONS } from "../release-watch-model";
import styles from "../ReleaseWatch.module.css";

interface ReleaseWatchToolbarProps {
	isLoading: boolean;
	scopeFilter: ReleaseWatchScopeFilter;
	onRefresh: () => void;
	onScopeFilterChange: (scope: ReleaseWatchScopeFilter) => void;
}

const ReleaseWatchToolbar: FC<ReleaseWatchToolbarProps> = ({
																														 isLoading,
																														 scopeFilter,
																														 onRefresh,
																														 onScopeFilterChange,
																													 }) => (
	<div className={ styles.toolbar }>
		<Select<ReleaseWatchScopeFilter>
			value={ scopeFilter }
			options={ SCOPE_FILTER_OPTIONS }
			onChange={ onScopeFilterChange }
			className={ styles.filter }
			aria-label="Release watch scope"
		/>
		<Button
			onClick={ onRefresh }
			loading={ isLoading }
		>
			Refresh
		</Button>
	</div>
);

export default ReleaseWatchToolbar;
