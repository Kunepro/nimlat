import { ImageGalleryEditor } from "@nimlat/components";
import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import {
	Result,
	Spin,
} from "antd";
import type { FC } from "react";
import styles from "../edit-group/EditGroupModal.module.css";

interface EditImageGallerySectionProps {
	galleryError: string | null;
	isBusy: boolean;
	isLoadingGallery: boolean;
	tabs: ImageGalleryTab[];
	uploadingRole: Exclude<ImageGalleryRole, "thumbnail"> | null;
	onDeleteCandidate?: (role: ImageGalleryRole, candidateKey: string) => void;
	onSelectCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	onUpload: (role: ImageGalleryRole) => void;
}

const EditImageGallerySection: FC<EditImageGallerySectionProps> = ({
																																		 galleryError,
																																		 isBusy,
																																		 isLoadingGallery,
																																		 tabs,
																																		 uploadingRole,
																																		 onDeleteCandidate,
																																		 onSelectCandidate,
																																		 onUpload,
																																	 }) => (
	<div className={ styles.gallerySection }>
		{ isLoadingGallery ? (
			<div className={ styles.galleryLoading }>
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
				tabs={ tabs }
				isBusy={ isBusy }
				isUploadingRole={ uploadingRole }
				onUpload={ onUpload }
				onSelectCandidate={ onSelectCandidate }
				onDeleteCandidate={ onDeleteCandidate }
			/>
		) }
	</div>
);

export default EditImageGallerySection;
