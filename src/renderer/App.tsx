import { PixiAppBackground } from "@nimlat/components";
import {
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import { FC } from "react";
import styles from "./App.module.css";
import {
	useAppShellState,
	useToasterMessages,
} from "./hooks";
import ModalsProvider from "./modals/ModalsProvider";

const App: FC = () => {
	const location        = useLocation();
	const backgroundStyle = useAppShellState(location.href);
	useToasterMessages();

	return (
		<PixiAppBackground
			backgroundStyle={ backgroundStyle }
			className={ styles.background }
		>
			<main className={ styles.main }>
				<ModalsProvider/>
				<Outlet/>
			</main>
		</PixiAppBackground>
	);
};

export default App;
