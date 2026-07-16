import { FC } from "react";
import ServerNodeIllustration from "../empty-illustration/ServerNodeIllustration";
import GlowButton from "../glow-button/GlowButton";
import styles from "./LibraryEmptyState.module.css";

interface LibraryEmptyStateProps {
	onDownloadAnimeDb: () => void;
}

const LibraryEmptyState: FC<LibraryEmptyStateProps> = ({ onDownloadAnimeDb }) => {
	return (
		<section className={ styles.wrapper }>
			<div className={ styles.illustration }>
				<ServerNodeIllustration/>
			</div>
			<div className={ styles.content }>
				<GlowButton onClick={ onDownloadAnimeDb }>
					Download AnimeDB
				</GlowButton>
			</div>
		</section>
	);
};

export default LibraryEmptyState;
