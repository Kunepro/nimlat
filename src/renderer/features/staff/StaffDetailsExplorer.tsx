import { InspectionInfoPanel } from "@nimlat/components";
import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import { FC } from "react";
import styles from "../character/CharacterDetailsExplorer.module.css";
import { useGroupsShellHistoryBackHeader } from "../groups/groups-shell/use-groups-shell-history-back-header";
import StaffMediaCreditsSection from "./components/StaffMediaCreditsSection";
import { useStaffInspection } from "./hooks/use-staff-inspection";
import {
	buildStaffInspectionFields,
	stripAniListStaffDescription,
} from "./staff-details-explorer-model";

const StaffDetailsExplorer: FC = () => {
	const {
					staffId,
					staff,
					isLoading,
					errorMessage,
				} = useStaffInspection();

	useGroupsShellHistoryBackHeader({
		title: staff?.name || `Staff ${ staffId }`,
	});

	if (isLoading) {
		return (
			<section className="flex-center full-screen-v">
				<Spin size="large"/>
			</section>
		);
	}

	if (errorMessage) {
		return <Result
			status="error"
			title="Could not load staff"
			subTitle={ errorMessage }
		/>;
	}

	if (!staff) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="Staff member not found."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<InspectionInfoPanel
				title={ staff.name }
				description={ stripAniListStaffDescription(staff.description) }
				imageUrl={ staff.imageUrl }
				imagePreview
				fields={ buildStaffInspectionFields(staff) }
			/>
			<StaffMediaCreditsSection medias={ staff.medias }/>
		</section>
	);
};

export default StaffDetailsExplorer;
