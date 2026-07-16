import { GroupOutlined } from "@ant-design/icons";
import type {
	LibraryAdultFilter,
	LibraryDisplayMode,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import type { CheckboxChangeEvent } from "antd/es/checkbox";
import Checkbox from "antd/es/checkbox";
import Select from "antd/es/select";
import Tooltip from "antd/es/tooltip";
import type { FC } from "react";
import {
	createLibraryMetadataSelectOptions,
	getNextLibraryAdultFilter,
} from "../../library-header-actions-model";
import styles from "./LibraryFilterPopoverContent.module.css";

interface LibraryFilterPopoverContentProps {
	adultFilter: LibraryAdultFilter;
	displayMode: LibraryDisplayMode;
	filterOptions: LibraryFilterOptions;
	genreNames: string[];
	isAdultContentEnabled: boolean;
	tagNames: string[];
	onAdultFilterChange: (filter: LibraryAdultFilter) => void;
	onDisplayModeChange: (mode: LibraryDisplayMode) => void;
	onMetadataFiltersChange: (filters: { genreNames: string[]; tagNames: string[] }) => void;
}

const LibraryFilterPopoverContent: FC<LibraryFilterPopoverContentProps> = ({
																																						 adultFilter,
																																						 displayMode,
																																						 filterOptions,
																																						 genreNames,
																																						 isAdultContentEnabled,
																																						 tagNames,
																																						 onAdultFilterChange,
																																						 onDisplayModeChange,
																																						 onMetadataFiltersChange,
																																					 }) => {
	const genreOptions = createLibraryMetadataSelectOptions(filterOptions.genreNames);
	const tagOptions   = createLibraryMetadataSelectOptions(filterOptions.tagNames);

	const handleAdultFilterToggle = () => {
		// This checkbox intentionally cycles through mixed, adult-only, and non-adult-only states.
		onAdultFilterChange(getNextLibraryAdultFilter(adultFilter));
	};

	const handleDisplayModeToggle = (event: CheckboxChangeEvent) => {
		onDisplayModeChange(event.target.checked ? "groups" : "rawMedia");
	};

	const handleGenreNamesChange = (nextGenreNames: string[]) => {
		onMetadataFiltersChange({
			genreNames: nextGenreNames,
			tagNames,
		});
	};

	const handleTagNamesChange = (nextTagNames: string[]) => {
		onMetadataFiltersChange({
			genreNames,
			tagNames: nextTagNames,
		});
	};

	return (
		<div className={ styles.filterMenu }>
			<div className={ styles.filterToggleRow }>
				<Tooltip title="Show groups">
					<Checkbox
						aria-label="Show groups"
						checked={ displayMode === "groups" }
						onChange={ handleDisplayModeToggle }
					>
						<span className={ styles.filterToggleLabel }>
							<GroupOutlined/>
							Show groups
						</span>
					</Checkbox>
				</Tooltip>
			</div>
			{ isAdultContentEnabled ? (
				<div className={ styles.filterToggleRow }>
					<Tooltip title="Filter adult content">
						<Checkbox
							aria-label="show adult content"
							checked={ adultFilter === "adult" }
							indeterminate={ adultFilter === "mixed" }
							onChange={ handleAdultFilterToggle }
						>
							<span className={ styles.filterToggleLabel }>
								<span className={ styles.adultFilterLabel }>18+</span>
								Adult content
							</span>
						</Checkbox>
					</Tooltip>
				</div>
			) : null }
			<label className={ styles.filterField }>
				<span className={ styles.filterFieldLabel }>Genres</span>
				<Select
					className={ styles.metadataSelect }
					mode="tags"
					allowClear
					maxTagCount="responsive"
					placeholder="Genres"
					aria-label="Filter genres"
					options={ genreOptions }
					value={ genreNames }
					onChange={ handleGenreNamesChange }
				/>
			</label>
			<label className={ styles.filterField }>
				<span className={ styles.filterFieldLabel }>Tags</span>
				<Select
					className={ styles.metadataSelect }
					mode="tags"
					allowClear
					maxTagCount="responsive"
					placeholder="Tags"
					aria-label="Filter tags"
					options={ tagOptions }
					value={ tagNames }
					onChange={ handleTagNamesChange }
				/>
			</label>
		</div>
	);
};

export default LibraryFilterPopoverContent;
