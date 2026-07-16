import { MediaInspectionGroupCard } from "@nimlat/types/ipc-payloads";
import { Link } from "@tanstack/react-router";
import { memo } from "react";
import { ROUTES } from "../../../constants/route-config";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import styles from "./MediaGroupsSection.module.css";

interface MediaGroupsSectionProps {
	groups?: MediaInspectionGroupCard[];
}

interface MediaGroupCardProps {
	group: MediaInspectionGroupCard;
}

function MediaGroupCardComponent({ group }: MediaGroupCardProps) {
	const imageUrl = group.displayImageUrl || group.imageUrl || undefined;

	return (
		<Link
			to={ ROUTES.GROUPS.GROUP.DETAILS_FULL_URL }
			params={ {
				groupSource: group.source,
				groupId:     group.groupId.toString(),
			} }
			className={ styles.groupCard }
		>
			<div className={ styles.groupPosterFrame }>
				{ imageUrl ? (
					<img
						className={ styles.groupPoster }
						src={ resolveImageSrc(imageUrl) }
						alt=""
						loading="lazy"
					/>
				) : (
					<div className={ styles.groupPosterFallback }>
						{ group.name.slice(
							0,
							1,
						).toUpperCase() }
					</div>
				) }
			</div>
			<div className={ styles.groupMeta }>
				<div className={ styles.groupTitle }>{ group.name }</div>
				<div className={ styles.groupSubline }>{ group.source }</div>
			</div>
		</Link>
	);
}

function areMediaGroupCardPropsEqual(prevProps: MediaGroupCardProps, nextProps: MediaGroupCardProps): boolean {
	return prevProps.group.groupId === nextProps.group.groupId
		&& prevProps.group.source === nextProps.group.source
		&& prevProps.group.name === nextProps.group.name
		&& prevProps.group.imageUrl === nextProps.group.imageUrl
		&& prevProps.group.displayImageUrl === nextProps.group.displayImageUrl;
}

const MediaGroupCard = memo(
	MediaGroupCardComponent,
	areMediaGroupCardPropsEqual,
);

function MediaGroupsSectionComponent({ groups }: MediaGroupsSectionProps) {
	if (!groups?.length) {
		return null;
	}

	return (
		<section className={ styles.groupsSection }>
			<div className={ styles.sectionHeader }>
				<h2>Groups</h2>
			</div>
			<div className={ styles.groupGrid }>
				{ groups.map(group => (
					<MediaGroupCard
						key={ `${ group.source }-${ group.groupId }` }
						group={ group }
					/>
				)) }
			</div>
		</section>
	);
}

function areMediaGroupsSectionPropsEqual(prevProps: MediaGroupsSectionProps, nextProps: MediaGroupsSectionProps): boolean {
	return prevProps.groups === nextProps.groups;
}

const MediaGroupsSection = memo(
	MediaGroupsSectionComponent,
	areMediaGroupsSectionPropsEqual,
);

export default MediaGroupsSection;
