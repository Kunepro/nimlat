import type { ImageGalleryRole } from "@nimlat/types/anime-db";
import type { ImageGalleryTab } from "@nimlat/types/ipc-payloads";
import Tabs from "antd/es/tabs";
import type { FC } from "react";
import "react-lazy-load-image-component/src/effects/blur.css";
import ImageGalleryTabContent from "./components/ImageGalleryTabContent";

interface ImageGalleryEditorProps {
	tabs: ImageGalleryTab[];
	isBusy: boolean;
	isUploadingRole?: ImageGalleryRole | null;
	onUpload: (role: ImageGalleryRole) => void;
	onSelectCandidate: (role: ImageGalleryRole, candidateKey: string) => void;
	onDeleteCandidate?: (role: ImageGalleryRole, candidateKey: string) => void;
}

// Render one Plex-style selectable image gallery with role tabs.
// The component is renderer-only: all persistence stays in main and callers own the final tab state.
const ImageGalleryEditor: FC<ImageGalleryEditorProps> = ({
																													 tabs,
																													 isBusy,
																													 isUploadingRole,
																													 onUpload,
																													 onSelectCandidate,
																													 onDeleteCandidate,
																												 }) => {
	if (tabs.length === 1 && tabs[ 0 ]) {
		return (
			<ImageGalleryTabContent
				isBusy={ isBusy }
				isSingleTab
				isUploadingRole={ isUploadingRole }
				tab={ tabs[ 0 ] }
				onDeleteCandidate={ onDeleteCandidate }
				onSelectCandidate={ onSelectCandidate }
				onUpload={ onUpload }
			/>
		);
	}

	return (
		<Tabs
			items={ tabs.map(tab => ({
				key:      tab.role,
				label:    tab.title,
				children: (
										<ImageGalleryTabContent
											isBusy={ isBusy }
						          isUploadingRole={ isUploadingRole }
						          tab={ tab }
						          onDeleteCandidate={ onDeleteCandidate }
						          onSelectCandidate={ onSelectCandidate }
						          onUpload={ onUpload }
										/>
									),
			})) }
		/>
	);
};

export default ImageGalleryEditor;
