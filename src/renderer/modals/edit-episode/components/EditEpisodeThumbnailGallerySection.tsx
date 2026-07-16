import { ImageGalleryEditor } from "@nimlat/components";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import {
	Result,
	Spin,
} from "antd";
import type { FC } from "react";
import styles from "../EditEpisodeModal.module.css";

interface EditEpisodeThumbnailGallerySectionProps {
	galleryError: string | null;
	isBusy: boolean;
	isLoadingGallery: boolean;
	thumbnailTabs: ImageGalleryTab[];
	uploadingRole: "thumbnail" | null;
	onSelectThumbnail: (candidateKey: string) => void;
	onUploadThumbnail: () => void;
}

const EditEpisodeThumbnailGallerySection: FC<EditEpisodeThumbnailGallerySectionProps> = ({
																																													 galleryError,
																																													 isBusy,
																																													 isLoadingGallery,
																																													 thumbnailTabs,
																																													 uploadingRole,
																																													 onSelectThumbnail,
																																													 onUploadThumbnail,
																																												 }) => (
	<div className={ styles.previewSection }>
		{ isLoadingGallery ? (
			<div className={ styles.previewPlaceholder }>
				<Spin size="small"/>
				<span>Loading images</span>
			</div>
		) : galleryError ? (
			<Result
				status="warning"
				title="Could not load gallery"
				subTitle={ galleryError }
			/>
		) : (
			<ImageGalleryEditor
				tabs={ thumbnailTabs }
				isBusy={ isBusy }
				isUploadingRole={ uploadingRole }
				onUpload={ onUploadThumbnail }
				onSelectCandidate={ (_role, candidateKey) => onSelectThumbnail(candidateKey) }
			/>
		) }
	</div>
);

export default EditEpisodeThumbnailGallerySection;
