import {
	CheckCircleOutlined,
	EditOutlined,
	EyeInvisibleOutlined,
	PoweroffOutlined,
	ReloadOutlined,
} from "@ant-design/icons";
import Button from "antd/es/button";
import Space from "antd/es/space";
import Tooltip from "antd/es/tooltip";
import type { FC } from "react";
import type { MediaHeroIgnorePresentation } from "./media-details-hero-model";
import styles from "./MediaDetailsHero.module.css";

interface MediaDetailsHeroBodyProps {
	description?: string;
	ignorePresentation: MediaHeroIgnorePresentation;
	isRefreshingMetadata: boolean;
	isUpdatingWatchedState: boolean;
	isWatched: boolean;
	mediaName: string;
	watchedLabel: string;
	onEdit: () => void;
	onIgnore: () => void;
	onRefreshMetadata: () => void;
	onWatchedToggle: () => void;
}

const MediaDetailsHeroBody: FC<MediaDetailsHeroBodyProps> = ({
																															 description,
																															 ignorePresentation,
																															 isRefreshingMetadata,
																															 isUpdatingWatchedState,
																															 isWatched,
																															 mediaName,
																															 watchedLabel,
																															 onEdit,
																															 onIgnore,
																															 onRefreshMetadata,
																															 onWatchedToggle,
																														 }) => (
	<div className={ styles.bodyColumn }>
		<div className={ styles.titleRow }>
			<div className={ styles.titleBlock }>
				<h2 className={ styles.title }>{ mediaName }</h2>
			</div>
			<Space className={ styles.iconActions }>
				<Tooltip title="Refresh media data">
					<Button
						icon={ <ReloadOutlined/> }
						loading={ isRefreshingMetadata }
						aria-label="Refresh media data"
						onClick={ onRefreshMetadata }
					/>
				</Tooltip>
				<Tooltip title={ ignorePresentation.tooltipTitle }>
					<Button
						icon={ <EyeInvisibleOutlined/> }
						disabled={ ignorePresentation.isDisabled }
						loading={ ignorePresentation.isLoading }
						aria-label={ ignorePresentation.ariaLabel }
						onClick={ onIgnore }
					/>
				</Tooltip>
				<Tooltip title="Edit media">
					<Button
						icon={ <EditOutlined/> }
						aria-label="Edit media"
						onClick={ onEdit }
					/>
				</Tooltip>
			</Space>
		</div>
		{ description ? <p className={ styles.description }>{ description }</p> : null }
		<div className={ styles.primaryActions }>
			<Button
				type={ isWatched ? "default" : "primary" }
				icon={ isWatched ? <CheckCircleOutlined/> : <PoweroffOutlined/> }
				loading={ isUpdatingWatchedState }
				aria-pressed={ isWatched }
				className={ isWatched ? styles.watchedActionOn : styles.watchedActionOff }
				onClick={ onWatchedToggle }
			>
				<span className={ styles.watchedActionLabel }>{ watchedLabel }</span>
			</Button>
		</div>
	</div>
);

export default MediaDetailsHeroBody;
