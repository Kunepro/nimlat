import type { StaffMediaCreditCard as StaffMediaCreditCardData } from "@nimlat/types/ipc-payloads";
import Empty from "antd/es/empty";
import type { FC } from "react";
import styles from "../../character/CharacterDetailsExplorer.module.css";
import { createStaffMediaCreditKey } from "../staff-details-explorer-model";
import StaffMediaCreditCard from "./StaffMediaCreditCard";

interface StaffMediaCreditsSectionProps {
	medias: StaffMediaCreditCardData[];
}

const StaffMediaCreditsSection: FC<StaffMediaCreditsSectionProps> = ({ medias }) => (
	<>
		<div className={ styles.mediaSectionHeader }>
			<h2>Credits</h2>
			<span>{ medias.length } loaded</span>
		</div>
		{ medias.length > 0 ? (
			<div className={ styles.mediaGrid }>
				{ medias.map((credit) => (
					<StaffMediaCreditCard
						key={ createStaffMediaCreditKey(credit) }
						credit={ credit }
					/>
				)) }
			</div>
		) : (
			<Empty description="No local media credits are loaded for this staff member yet."/>
		) }
	</>
);

export default StaffMediaCreditsSection;
