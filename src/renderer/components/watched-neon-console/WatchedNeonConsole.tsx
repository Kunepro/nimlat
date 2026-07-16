import { memo } from "react";
import PowerCableInteraction from "./PowerCableInteraction";
import type { WatchedNeonConsoleStatus } from "./watched-neon-console-model";
import styles from "./WatchedNeonConsole.module.css";

interface WatchedNeonConsoleProps {
	status: WatchedNeonConsoleStatus;
	checked: boolean;
	loading?: boolean;
	disabled?: boolean;
	showStatusLabel?: boolean;
	ariaLabel: string;
	onToggle: () => void;
}

const WatchedNeonConsole = memo(function WatchedNeonConsole({
																															status,
																															checked,
																															loading = false,
																															disabled = false,
																															showStatusLabel = true,
																															ariaLabel,
																															onToggle,
																														}: WatchedNeonConsoleProps) {
	return (
		<section
			className={ `${ styles.console } ${ styles[ status ] } ${ checked ? styles.connected : styles.disconnected }` }
			aria-label="Watched neon power control"
		>
			<PowerCableInteraction
				status={ status }
				connected={ checked }
				disabled={ disabled }
				loading={ loading }
				showStatusLabel={ showStatusLabel }
				ariaLabel={ ariaLabel }
				onConnect={ () => {
					if (!checked) {
						onToggle();
					}
				} }
				onDisconnect={ () => {
					if (checked) {
						onToggle();
					}
				} }
			/>
		</section>
	);
});

export default WatchedNeonConsole;
