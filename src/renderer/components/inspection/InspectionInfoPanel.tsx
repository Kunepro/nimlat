import Card from "antd/es/card";
import Modal from "antd/es/modal";
import React, {
	FC,
	ReactNode,
	useState,
} from "react";
import type { InspectionInfoField } from "../../types/components";
import { resolveImageSrc } from "../../utils/resolve-image-src";
import styles from "./InspectionInfoPanel.module.css";

interface InspectionInfoPanelProps {
	title: string;
	description?: string;
	imageUrl?: string;
	bannerImageUrl?: string;
	imagePreview?: boolean;
	imageOverlay?: ReactNode;
	fields: InspectionInfoField[];
	actions?: ReactNode;
	panelAccessory?: ReactNode;
}

const InspectionInfoPanel: FC<InspectionInfoPanelProps> = ({
																														 title,
																														 description,
																														 imageUrl,
																														 bannerImageUrl,
																														 imagePreview = false,
																														 imageOverlay,
																														 fields,
																														 actions,
																														 panelAccessory,
																													 }) => {
	const [ isPreviewOpen, setPreviewOpen ] = useState(false);
	const resolvedImageUrl = imageUrl ? resolveImageSrc(imageUrl) : undefined;
	const imageContent = resolvedImageUrl ? (
		<div className={ styles.imageFrame }>
			<img
				src={ resolvedImageUrl }
				alt={ title }
				className={ styles.image }
			/>
			{ imageOverlay }
		</div>
	) : null;

	return (
		<>
			<Card className={ styles.panel }>
				{ bannerImageUrl ? (
					<div className={ styles.bannerWrap }>
						<img
							src={ resolveImageSrc(bannerImageUrl) }
							alt=""
							aria-hidden="true"
							className={ styles.banner }
						/>
						<div className={ styles.bannerOverlay }/>
					</div>
				) : null }
				<div className={ styles.inner }>
					{ resolvedImageUrl && (
						imagePreview ? (
							<button
								type="button"
								className={ styles.imagePreviewButton }
								aria-label={ `Open ${ title } image full size` }
								onClick={ () => setPreviewOpen(true) }
							>
								{ imageContent }
							</button>
						) : (
							imageContent
						)
					) }
					<div className={ styles.content }>
						<div className={ styles.header }>
							<h2 className={ styles.title }>{ title }</h2>
							{ actions ? <div className={ styles.actions }>{ actions }</div> : null }
						</div>
						{ description ? <p className={ styles.description }>{ description }</p> : null }
						{ fields.length > 0 ? (
							<div className={ styles.fields }>
								{ fields.map(field => (
									<div
										key={ field.label }
										className={ styles.field }
									>
										<span className={ styles.fieldLabel }>{ field.label }:</span>
										<span className={ styles.fieldValue }>{ field.value }</span>
									</div>
								)) }
							</div>
						) : null }
						{ panelAccessory ? <div className={ styles.panelAccessory }>{ panelAccessory }</div> : null }
					</div>
				</div>
			</Card>
			<Modal
				centered
				className={ styles.imagePreviewModal }
				footer={ null }
				open={ isPreviewOpen }
				title={ title }
				width="fit-content"
				onCancel={ () => setPreviewOpen(false) }
			>
				{ resolvedImageUrl ? (
					<img
						src={ resolvedImageUrl }
						alt={ title }
						className={ styles.imagePreview }
					/>
				) : null }
			</Modal>
		</>
	);
};

export default InspectionInfoPanel;
