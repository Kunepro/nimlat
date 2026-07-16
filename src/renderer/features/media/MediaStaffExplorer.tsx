import Empty from "antd/es/empty";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import { FC } from "react";
import styles from "./media-characters-explorer/MediaCharactersExplorer.module.css";
import StaffCard from "./media-staff-explorer/components/StaffCard";
import { useMediaStaff } from "./media-staff-explorer/hooks/use-media-staff";

const MediaStaffExplorer: FC = () => {
	const {
					staff,
					isLoading,
					errorMessage,
				} = useMediaStaff();

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

	if (staff.length === 0) {
		return (
			<section className="flex-center full-screen-v">
				<Empty description="No staff loaded for this media yet."/>
			</section>
		);
	}

	return (
		<section className={ styles.wrapper }>
			<div className={ styles.toolbar }>
				<span>{ staff.length } loaded</span>
			</div>
			<div className={ styles.grid }>
				{ staff.map((staffMember) => (
					<StaffCard
						key={ `${ staffMember.staffId }:${ staffMember.role ?? "Unknown" }` }
						staff={ staffMember }
					/>
				)) }
			</div>
		</section>
	);
};

export default MediaStaffExplorer;
