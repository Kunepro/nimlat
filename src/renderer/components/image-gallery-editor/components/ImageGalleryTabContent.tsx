import { PlusOutlined } from "@ant-design/icons";
import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import Button from "antd/es/button";
import Empty from "antd/es/empty";
import type { FC } from "react";
import {
	getImageGalleryEmptyDescription,
	isImageGalleryCandidateSelected,
	isPortraitImageGalleryRole,
} from "../image-gallery-editor-model";
import styles from "../ImageGalleryEditor.module.css";
import ImageGalleryCandidateCard from "./ImageGalleryCandidateCard";

interface ImageGalleryTabContentProps {
	isBusy: boolean;
	isUploadingRole?: ImageGalleryRole | null;
	isSingleTab?: boolean;
	tab: ImageGalleryTab;
	onDeleteCandidate?: (role: ImageGalleryRole, candidateKey: string) => void;
	onSelectCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	onUpload: (role: ImageGalleryRole) => void;
}

const ImageGalleryTabContent: FC<ImageGalleryTabContentProps> = ({
																																	 isBusy,
																																	 isUploadingRole,
																																	 isSingleTab,
																																	 tab,
																																	 onDeleteCandidate,
																																	 onSelectCandidate,
																																	 onUpload,
																																 }) => (
	<div className={ styles.tabBody }>
		<div className={ `${ styles.tabActions } ${ isSingleTab ? styles.tabActionsCentered : "" }` }>
			<Button
				type="primary"
				icon={ <PlusOutlined/> }
				loading={ isUploadingRole === tab.role }
				disabled={ isBusy }
				onClick={ () => onUpload(tab.role) }
			>
				Upload image
			</Button>
		</div>
		{ tab.candidates.length === 0 ? (
			<div className={ styles.emptyWrap }>
				<Empty description={ getImageGalleryEmptyDescription(tab.title) }/>
			</div>
		) : (
			<div
				className={ `${ styles.grid } ${ isPortraitImageGalleryRole(tab.role)
					? styles.gridPortrait
					: styles.gridBanner }` }
			>
				{ tab.candidates.map(candidate => (
					<ImageGalleryCandidateCard
						key={ candidate.candidateKey }
						candidate={ candidate }
						isBusy={ isBusy }
						isSelected={ isImageGalleryCandidateSelected(
							tab,
							candidate,
						) }
						role={ tab.role }
						onDeleteCandidate={ onDeleteCandidate }
						onSelectCandidate={ onSelectCandidate }
					/>
				)) }
			</div>
		) }
	</div>
);

export default ImageGalleryTabContent;
