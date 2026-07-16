import { FC } from "react";
import ErroredContentDetailModal from "./components/ErroredContentDetailModal";
import ErroredContentHeader from "./components/ErroredContentHeader";
import ErroredContentTable from "./components/ErroredContentTable";
import ErroredContentToolbar from "./components/ErroredContentToolbar";
import styles from "./ErroredContent.module.css";
import { useErroredContentState } from "./hooks/use-errored-content-state";

const ErroredContent: FC = () => {
	const {
					filter,
					setFilter,
					search,
					setSearch,
					showHidden,
					toggleShowHidden,
					visibleItems,
					total,
					nextOffset,
					isLoading,
					isRetryingAll,
					pendingActionKeys,
					detailItem,
					setDetailItem,
					loadMore,
					retryItem,
					retryAll,
					hideItem,
					reportItem,
					openMedia,
				} = useErroredContentState();

	return (
		<section className={ styles.wrapper }>
			<ErroredContentHeader/>
			<ErroredContentToolbar
				filter={ filter }
				search={ search }
				showHidden={ showHidden }
				isRetryingAll={ isRetryingAll }
				isRetryAllDisabled={ total === 0 || isLoading }
				onFilterChange={ setFilter }
				onSearchChange={ setSearch }
				onToggleShowHidden={ toggleShowHidden }
				onRetryAll={ () => void retryAll() }
			/>
			<ErroredContentTable
				items={ visibleItems }
				pendingActionKeys={ pendingActionKeys }
				isLoading={ isLoading }
				canLoadMore={ nextOffset != null }
				onLoadMore={ () => void loadMore() }
				onOpenMedia={ openMedia }
				onRetry={ item => void retryItem(item) }
				onReport={ item => void reportItem(item) }
				onHide={ item => void hideItem(item) }
				onOpenDetails={ setDetailItem }
			/>
			<ErroredContentDetailModal
				item={ detailItem }
				pendingActionKeys={ pendingActionKeys }
				onClose={ () => setDetailItem(null) }
				onOpenMedia={ openMedia }
				onRetry={ item => void retryItem(item) }
				onReport={ item => void reportItem(item) }
				onHide={ item => void hideItem(item) }
			/>
		</section>
	);
};

export default ErroredContent;
