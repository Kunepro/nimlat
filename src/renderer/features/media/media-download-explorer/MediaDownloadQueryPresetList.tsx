import { DeleteOutlined } from "@ant-design/icons";
import { CircuitToggle } from "@nimlat/components";
import {
	DownloadSearchKeywordPreset,
	DownloadSearchQueryPreset,
} from "@nimlat/types/download-search";
import Button from "antd/es/button";
import Empty from "antd/es/empty";
import Popconfirm from "antd/es/popconfirm";
import { FC } from "react";
import { buildDownloadSearchPresetQuery } from "./media-download-explorer.utils";
import styles from "./MediaDownloadQueryPresetList.module.css";

interface MediaDownloadQueryPresetListProps {
	title: string;
	presets: DownloadSearchKeywordPreset[];
	queryPresets: DownloadSearchQueryPreset[];
	onToggleQueryPreset: (presetId: string, enabled: boolean) => void;
	onDeleteQueryPreset: (presetId: string) => void;
}

const BASE_QUERY_PRESET_ID = "query-preset-base-default";

const MediaDownloadQueryPresetList: FC<MediaDownloadQueryPresetListProps> = ({
																																							 title,
																																							 presets,
																																							 queryPresets,
																																							 onToggleQueryPreset,
																																							 onDeleteQueryPreset,
																																						 }) => (
	<div className={ styles.compactPanel }>
		<div className={ styles.presetList }>
			{ queryPresets.length === 0 ? (
				<Empty
					image={ Empty.PRESENTED_IMAGE_SIMPLE }
					description="No download search presets."
				/>
			) : queryPresets.map((preset) => (
				<div
					key={ preset.id }
					className={ styles.presetItem }
				>
					<div className={ styles.presetItemTitle }>{ preset.label }</div>
					<div className={ styles.variantQuery }>
						{ buildDownloadSearchPresetQuery(
							title,
							presets,
							preset,
						) }
					</div>
					<CircuitToggle
						checked={ preset.enabled }
						ariaLabel={ `${ preset.enabled ? "Disable" : "Enable" } ${ preset.label } preset` }
						size="compact"
						onChange={ (checked) => onToggleQueryPreset(
							preset.id,
							checked,
						) }
					/>
					{ preset.id === BASE_QUERY_PRESET_ID ? (
						<div
							className={ styles.deleteSlot }
							aria-hidden="true"
						/>
					) : (
						<Popconfirm
							title="Delete preset?"
							description="Are you sure?"
							okText="Confirm"
							cancelText="Cancel"
							onConfirm={ () => onDeleteQueryPreset(preset.id) }
						>
							<Button
								size="small"
								danger
								icon={ <DeleteOutlined/> }
								aria-label={ `Delete ${ preset.label } preset` }
							/>
						</Popconfirm>
					) }
				</div>
			)) }
		</div>
	</div>
);

export default MediaDownloadQueryPresetList;
