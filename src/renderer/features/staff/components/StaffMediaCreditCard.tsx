import { StaffMediaCreditCard as StaffMediaCreditCardData } from "@nimlat/types/ipc-payloads";
import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { ROUTES } from "../../../constants/route-config";
import { createRouteHistoryState } from "../../../types/router-history-state";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import styles from "../../character/CharacterDetailsExplorer.module.css";

interface StaffMediaCreditCardProps {
	credit: StaffMediaCreditCardData;
}

function StaffMediaCreditCardComponent({ credit }: StaffMediaCreditCardProps) {
	const mediaImageUrl = credit.displayMediaImageUrl || credit.mediaImageUrl;

	return (
		<Link
			to={ ROUTES.GROUPS.STANDALONE_MEDIA.DETAILS_FULL_URL }
			params={ { mediaId: credit.mediaId.toString() } }
			state={ createRouteHistoryState({
				mediaName: credit.mediaName,
				isFilm:    credit.format === "MOVIE",
			}) }
			className={ styles.mediaCard }
		>
			<div className={ styles.mediaPosterFrame }>
				{ mediaImageUrl ? (
					<img
						className={ styles.mediaPoster }
						src={ resolveImageSrc(mediaImageUrl) }
						alt=""
						loading="lazy"
					/>
				) : (
					<div className={ styles.mediaPosterFallback }>
						{ credit.mediaName.slice(
							0,
							1,
						).toUpperCase() }
					</div>
				) }
			</div>
			<div className={ styles.mediaMeta }>
				<div className={ styles.mediaTitle }>{ credit.mediaName }</div>
				<div className={ styles.mediaSubline }>
					{ [
						credit.format,
						credit.role,
					].filter(Boolean).join(" / ") || "Staff credit" }
				</div>
			</div>
		</Link>
	);
}

function areStaffMediaCreditCardPropsEqual(prevProps: StaffMediaCreditCardProps, nextProps: StaffMediaCreditCardProps): boolean {
	return prevProps.credit.mediaId === nextProps.credit.mediaId
		&& prevProps.credit.mediaName === nextProps.credit.mediaName
		&& prevProps.credit.format === nextProps.credit.format
		&& prevProps.credit.mediaImageUrl === nextProps.credit.mediaImageUrl
		&& prevProps.credit.displayMediaImageUrl === nextProps.credit.displayMediaImageUrl
		&& prevProps.credit.role === nextProps.credit.role;
}

const StaffMediaCreditCard = memo(
	StaffMediaCreditCardComponent,
	areStaffMediaCreditCardPropsEqual,
);

export default StaffMediaCreditCard;
