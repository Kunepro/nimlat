import {
	Card,
	Layout,
	Progress,
	Space,
} from "antd";
import { FC } from "react";
import PopulationActions from "./components/PopulationActions";
import PopulationAlerts from "./components/PopulationAlerts";
import PopulationIntro from "./components/PopulationIntro";
import PopulationMetrics from "./components/PopulationMetrics";
import {
	useDevModeFlag,
	usePopulationActions,
	usePopulationProgress,
	usePopulationProgressSummary,
} from "./hooks/use-populate-anime-db-state";
import styles from "./PopulateAnimeDb.module.css";

const { Content } = Layout;

const PopulateAnimeDb: FC = () => {
	const progress  = usePopulationProgress();
	const isDevMode = useDevModeFlag();
	const {
					uiError,
					pendingAction,
					handleStart,
					handleStop,
					handleRestart,
				}         = usePopulationActions();
	const {
					progressPercent,
					processedTotalLabel,
					progressStatus,
				}         = usePopulationProgressSummary(progress);

	return (
		<Layout className={ styles.layout }>
			<Content className={ styles.content }>
				<Card className={ styles.card }>
					<Space
						direction="vertical"
						size="large"
						className={ styles.stack }
					>
						<PopulationIntro/>
						<Progress
							percent={ progressPercent }
							status={ progressStatus }
						/>
						<PopulationMetrics
							progress={ progress }
							processedTotalLabel={ processedTotalLabel }
						/>
						<PopulationAlerts
							progressError={ progress.errorMessage }
							uiError={ uiError }
						/>
						<PopulationActions
							progress={ progress }
							pendingAction={ pendingAction }
							isDevMode={ isDevMode }
							onStart={ () => void handleStart() }
							onStop={ () => void handleStop() }
							onRestart={ () => void handleRestart() }
						/>
					</Space>
				</Card>
			</Content>
		</Layout>
	);
};

export default PopulateAnimeDb;
