import { MediaStaffListItem } from "@nimlat/types/ipc-payloads";
import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { ROUTES } from "../../../../constants/route-config";
import { resolveImageSrc } from "../../../../utils/resolve-image-src";
import styles from "../../media-characters-explorer/MediaCharactersExplorer.module.css";

interface StaffCardProps {
	staff: MediaStaffListItem;
}

function StaffCardComponent({ staff }: StaffCardProps) {
	const secondary = staff.primaryOccupations.length > 0
		? staff.primaryOccupations.slice(
			0,
			2,
		).join(" / ")
		: staff.nameNative;

	return (
		<article className={ styles.card }>
			<Link
				to={ ROUTES.GROUPS.STAFF.FULL_URL }
				params={ { staffId: staff.staffId.toString() } }
				className={ styles.cardLink }
			>
				<div className={ styles.portraitFrame }>
					{ staff.imageUrl ? (
						<img
							className={ styles.portrait }
							src={ resolveImageSrc(staff.imageUrl) }
							alt=""
							loading="lazy"
						/>
					) : (
						<div className={ styles.portraitFallback }>
							{ staff.name.slice(
								0,
								1,
							).toUpperCase() }
						</div>
					) }
				</div>
				<div className={ styles.cardBody }>
					<div className={ styles.characterName }>{ staff.name }</div>
					{ secondary ? <div className={ styles.nativeName }>{ secondary }</div> : null }
					{ staff.role ? <div className={ styles.role }>{ staff.role }</div> : null }
				</div>
			</Link>
		</article>
	);
}

function areStaffCardPropsEqual(prevProps: StaffCardProps, nextProps: StaffCardProps): boolean {
	return prevProps.staff.staffId === nextProps.staff.staffId
		&& prevProps.staff.name === nextProps.staff.name
		&& prevProps.staff.nameNative === nextProps.staff.nameNative
		&& prevProps.staff.imageUrl === nextProps.staff.imageUrl
		&& prevProps.staff.role === nextProps.staff.role
		&& prevProps.staff.primaryOccupations.length === nextProps.staff.primaryOccupations.length
		&& prevProps.staff.primaryOccupations.every((occupation, index) => occupation === nextProps.staff.primaryOccupations[ index ]);
}

const StaffCard = memo(
	StaffCardComponent,
	areStaffCardPropsEqual,
);

export default StaffCard;
