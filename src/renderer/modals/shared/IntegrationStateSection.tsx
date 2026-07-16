import type { FC } from "react";
import IntegrationIssueFlagGrid from "./components/IntegrationIssueFlagGrid";
import IntegrationIssueNoteField from "./components/IntegrationIssueNoteField";
import IntegrationPlaybackIssueMomentsList from "./components/IntegrationPlaybackIssueMomentsList";
import IntegrationStatusFormItem from "./components/IntegrationStatusFormItem";
import styles from "./IntegrationStateSection.module.css";

interface IntegrationStateSectionProps {
	supportsMoments: boolean;
	showStatus?: boolean;
	onIssueNoteBlur?: () => void;
	onIssueNoteClear?: () => void;
}

// Shared form section used by media and episode file-issue surfaces.
// Persistence and cascade rules stay in main; this component only owns form layout.
const IntegrationStateSection: FC<IntegrationStateSectionProps> = ({
																											 supportsMoments,
																											 showStatus = true,
																											 onIssueNoteBlur,
																											 onIssueNoteClear,
																																	 }) => (
	<section className={ styles.section }>
		{ showStatus ? <IntegrationStatusFormItem/> : null }
		<IntegrationIssueFlagGrid/>
		<IntegrationIssueNoteField
			onBlur={ onIssueNoteBlur }
			onClear={ onIssueNoteClear }
		/>
		{ supportsMoments ? <IntegrationPlaybackIssueMomentsList/> : null }
	</section>
);

export default IntegrationStateSection;
