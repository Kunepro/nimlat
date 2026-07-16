import type { MediaInspectionData } from "@nimlat/types/ipc-payloads";
import Tag from "antd/es/tag";
import { FC } from "react";
import styles from "./MediaCatalogDetails.module.css";

type MediaDetailsInspection = MediaInspectionData;

interface MediaCatalogDetailsProps {
	media: MediaDetailsInspection;
	onGenreClick?: (genreName: string) => void;
	onTagClick?: (tagName: string) => void;
}

const MediaCatalogDetails: FC<MediaCatalogDetailsProps> = ({
																														 media,
																														 onGenreClick,
																														 onTagClick,
																													 }) => {
	const hasGenres = Boolean(media.genres?.length);
	const hasTags = Boolean(media.tags?.length);

	if (!hasGenres && !hasTags) {
		return null;
	}

	return (
		<section className={ styles.taxonomyPanel }>
			{ hasGenres ? (
				<div className={ styles.tagGroup }>
					<h3 className={ styles.heading }>Genres</h3>
					<div className={ styles.tagList }>
						{ (media.genres ?? []).map(genre => (
							<Tag
								key={ genre }
								className={ onGenreClick ? styles.filterTag : undefined }
								role={ onGenreClick ? "button" : undefined }
								tabIndex={ onGenreClick ? 0 : undefined }
								onClick={ onGenreClick ? () => onGenreClick(genre) : undefined }
								onKeyDown={ onGenreClick
									? (event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onGenreClick(genre);
										}
									}
									: undefined }
							>
								{ genre }
							</Tag>
						)) }
					</div>
				</div>
			) : null }
			{ hasTags ? (
				<div className={ styles.tagGroup }>
					<h3 className={ styles.heading }>Tags</h3>
					<div className={ styles.tagList }>
						{ (media.tags ?? []).map(tag => (
							<Tag
								key={ `${ tag.category || "tag" }-${ tag.name }` }
								className={ onTagClick ? styles.filterTag : undefined }
								role={ onTagClick ? "button" : undefined }
								tabIndex={ onTagClick ? 0 : undefined }
								onClick={ onTagClick ? () => onTagClick(tag.name) : undefined }
								onKeyDown={ onTagClick
									? (event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onTagClick(tag.name);
										}
									}
									: undefined }
							>
								{ tag.name }
							</Tag>
						)) }
					</div>
				</div>
			) : null }
		</section>
	);
};

export default MediaCatalogDetails;
