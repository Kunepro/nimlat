import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import React, { FC } from "react";
import { ROUTES } from "../../../constants/route-config";
import GroupInspectionTabs from "../GroupInspectionTabs";
import { getGroupMediaGridOverlayState } from "./group-media-explorer-model";
import styles from "./GroupMediaExplorer.module.css";
import GroupMediaGridSection from "./GroupMediaGridSection";
import { useGroupMediaExplorerController } from "./hooks/useGroupMediaExplorerController";
import { useGroupMediaShellHeader } from "./hooks/useGroupMediaShellHeader";

const GroupMediaExplorer: FC = () => {
	const {
					groupId,
					groupSource,
					initialGroupName,
					group,
					groupRef,
					isLoadingSummary,
					summaryErrorMessage,
					hasLoadedMediaRange,
					mediaRangeErrorMessage,
					totalMediaItems,
					wallReloadKey,
					selectedMediaIds,
					selectedMediaCount,
					watchStateOverrides,
					isUpdatingGroupIntegrationStatus,
					notificationContextHolder,
					onBack,
					handleGroupIntegrationStatusChange,
					handleMediaIntegrationStatusChange,
					handleRangeLoaded,
					handleRangeLoadError,
					requestWallReload,
					toggleMediaSelection,
					refreshMedia,
					editMedia,
					removeSingleMedia,
					removeSelectedMedias,
					handleWatchStateChange,
				}                = useGroupMediaExplorerController();
	const gridOverlayState = getGroupMediaGridOverlayState({
		hasLoadedMediaRange,
		mediaRangeErrorMessage,
		totalMediaItems,
	});

	useGroupMediaShellHeader({
		groupId,
		groupSource,
		initialGroupName,
		group,
		groupRef,
		selectedMediaCount,
		isUpdatingGroupIntegrationStatus,
		onBack,
		onGroupIntegrationStatusChange: handleGroupIntegrationStatusChange,
		onRemoveSelectedMedias:         removeSelectedMedias,
	});

	if (isLoadingSummary) {
		return (
			<section className="flex-center full-screen-v">
				<Spin size="large"/>
			</section>
		);
	}

	if (summaryErrorMessage) {
		return (
			<Result
				status="error"
				title="Could not load group"
				subTitle={ summaryErrorMessage }
			/>
		);
	}

	if (!group || !groupRef) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Group not found."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			{ notificationContextHolder }
			<GroupInspectionTabs
				activeKey={ ROUTES.GROUPS.GROUP.MEDIAS }
				groupSource={ groupSource }
				groupId={ groupId }
				groupName={ group.name }
			/>
			<GroupMediaGridSection
				group={ groupRef }
				groupName={ group.name }
				dataKey={ `${ groupRef.source }:${ groupRef.groupId }` }
				reloadKey={ wallReloadKey }
				selectedMediaIds={ selectedMediaIds }
				watchStateOverrides={ watchStateOverrides }
				overlayState={ gridOverlayState }
				onRangeLoaded={ handleRangeLoaded }
				onRangeLoadError={ handleRangeLoadError }
				onToggleMediaSelection={ toggleMediaSelection }
				onRefreshMedia={ refreshMedia }
				onEditMedia={ editMedia }
				onRemoveMedia={ removeSingleMedia }
				onIntegrationStatusChange={ handleMediaIntegrationStatusChange }
				onWatchStateChange={ handleWatchStateChange }
				onRetryLoad={ () => requestWallReload(true) }
			/>
		</section>
	);
};

export default GroupMediaExplorer;
