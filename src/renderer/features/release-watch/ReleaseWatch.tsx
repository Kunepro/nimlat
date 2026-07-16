import { Tabs } from "antd";
import { FC } from "react";
import ReleaseWatchTable from "./components/ReleaseWatchTable";
import ReleaseWatchToolbar from "./components/ReleaseWatchToolbar";
import { useReleaseWatchController } from "./hooks/useReleaseWatchController";
import { RELEASE_WATCH_TAB_ITEMS } from "./release-watch-model";
import styles from "./ReleaseWatch.module.css";

const ReleaseWatch: FC = () => {
	const controller = useReleaseWatchController();

	return (
		<section className={ styles.wrapper }>
			<header className={ styles.header }>
				<div>
					<h1 className={ styles.title }>Release Watch</h1>
				</div>
			</header>

			<Tabs
				activeKey={ controller.activeTab }
				items={ RELEASE_WATCH_TAB_ITEMS }
				onChange={ controller.selectTab }
			/>

			<ReleaseWatchToolbar
				isLoading={ controller.isLoading }
				scopeFilter={ controller.scopeFilter }
				onRefresh={ controller.refreshActiveRows }
				onScopeFilterChange={ controller.setScopeFilter }
			/>

			<ReleaseWatchTable
				isLoading={ controller.isLoading }
				nextOffset={ controller.activeNextOffset }
				rows={ controller.activeRows }
				onLoadMore={ controller.loadMoreActiveRows }
			/>
		</section>
	);
};

export default ReleaseWatch;
