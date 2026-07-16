import {
	CheckOutlined,
	DeleteOutlined,
} from "@ant-design/icons";
import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryCandidate } from "@nimlat/types/ipc-payloads";
import Popconfirm from "antd/es/popconfirm";
import type { FC } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";
import { resolveImageSrc } from "../../../utils/resolve-image-src";
import {
	canDeleteImageGalleryCandidate,
	getImageGalleryCandidatePreviewUrl,
	isPortraitImageGalleryRole,
} from "../image-gallery-editor-model";
import styles from "../ImageGalleryEditor.module.css";

interface ImageGalleryCandidateCardProps {
	candidate: ImageGalleryCandidate;
	isBusy: boolean;
	isSelected: boolean;
	role: ImageGalleryRole;
	onDeleteCandidate?: (role: ImageGalleryRole, candidateKey: string) => void;
	onSelectCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
}

const ImageGalleryCandidateCard: FC<ImageGalleryCandidateCardProps> = ({
																																				 candidate,
																																				 isBusy,
																																				 isSelected,
																																				 role,
																																				 onDeleteCandidate,
																																				 onSelectCandidate,
																																			 }) => {
	const previewImageUrl = getImageGalleryCandidatePreviewUrl(candidate);
	const canDelete       = canDeleteImageGalleryCandidate(
		candidate,
		Boolean(onDeleteCandidate),
	);

	return (
		<div className={ `${ styles.card } ${ isSelected ? styles.cardSelected : "" }` }>
			{ isSelected ? (
				<>
					<span className={ styles.selectedCorner }/>
					<span className={ styles.selectedCheck }>
						<CheckOutlined/>
					</span>
				</>
			) : null }
			<button
				type="button"
				disabled={ isBusy }
				className={ styles.selectButton }
				onClick={ () => onSelectCandidate(
					role,
					candidate.candidateKey,
				) }
				aria-pressed={ isSelected }
				aria-label={ `Select ${ candidate.label }` }
			>
				<div
					className={ `${ styles.imageFrame } ${ isPortraitImageGalleryRole(role)
						? ""
						: styles.imageFrameBanner }` }
				>
					{ previewImageUrl ? (
						<LazyLoadImage
							effect="blur"
							src={ resolveImageSrc(previewImageUrl) }
							alt={ candidate.label }
							className={ styles.image }
							wrapperClassName={ styles.imageWrap }
						/>
					) : (
						<div className={ styles.imagePlaceholder }>
							No image
						</div>
					) }
				</div>
			</button>
			{ canDelete ? (
				<Popconfirm
					title="Delete uploaded image?"
					description="This removes the uploaded copy from this gallery."
					okText="Delete"
					cancelText="Cancel"
					okButtonProps={ { danger: true } }
					disabled={ isBusy }
					onConfirm={ () => onDeleteCandidate?.(
						role,
						candidate.candidateKey,
					) }
				>
					<button
						type="button"
						className={ styles.deleteButton }
						disabled={ isBusy }
						aria-label={ `Delete ${ candidate.label }` }
					>
						<DeleteOutlined/>
					</button>
				</Popconfirm>
			) : null }
		</div>
	);
};

export default ImageGalleryCandidateCard;
