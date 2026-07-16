import {
	EyeInvisibleOutlined,
	FilterOutlined,
	SearchOutlined,
	UnorderedListOutlined,
} from "@ant-design/icons";
import type {
	LibraryAdultFilter,
	LibraryDisplayMode,
	LibraryFilterOptions,
} from "@nimlat/types/ipc-payloads";
import Button from "antd/es/button";
import Input from "antd/es/input";
import Popconfirm from "antd/es/popconfirm";
import Popover from "antd/es/popover";
import type { FC } from "react";
import LibraryFilterPopoverContent from "./components/library-header/LibraryFilterPopoverContent";
import { useDebouncedSearchDraft } from "./hooks/useDebouncedSearchDraft";
import {
	getLibraryIgnoreConfirmationTitle,
	getLibrarySearchPlaceholder,
} from "./library-header-actions-model";
import styles from "./LibraryHeaderActions.module.css";

interface LibraryHeaderActionsProps {
	adultFilter: LibraryAdultFilter;
	displayMode: LibraryDisplayMode;
	isAdultContentEnabled: boolean;
	isIgnoredScope: boolean;
	isIgnoringSelected: boolean;
	filterOptions: LibraryFilterOptions;
	genreNames: string[];
	selectedCount: number;
	tagNames: string[];
	onAdultFilterChange: (filter: LibraryAdultFilter) => void;
	onDisplayModeChange: (mode: LibraryDisplayMode) => void;
	onIgnoreSelected: () => void;
	onMetadataFiltersChange: (filters: { genreNames: string[]; tagNames: string[] }) => void;
	onOpenAddTo: () => void;
	onSearchChange: (search: string) => void;
}

const LibraryHeaderActions: FC<LibraryHeaderActionsProps> = ({
																															 adultFilter,
																															 displayMode,
																															 isAdultContentEnabled,
																															 isIgnoredScope,
																															 isIgnoringSelected,
																															 filterOptions,
																															 genreNames,
																															 selectedCount,
																															 tagNames,
																															 onAdultFilterChange,
																															 onDisplayModeChange,
																															 onIgnoreSelected,
																															 onMetadataFiltersChange,
																															 onOpenAddTo,
																															 onSearchChange,
																														 }) => {
	const {
					draftSearch,
					handleSearchDraftChange,
				}          = useDebouncedSearchDraft({ onSearchChange });
	const filterMenu = (
		<LibraryFilterPopoverContent
			adultFilter={ adultFilter }
			displayMode={ displayMode }
			filterOptions={ filterOptions }
			genreNames={ genreNames }
			isAdultContentEnabled={ isAdultContentEnabled }
			tagNames={ tagNames }
			onAdultFilterChange={ onAdultFilterChange }
			onDisplayModeChange={ onDisplayModeChange }
			onMetadataFiltersChange={ onMetadataFiltersChange }
		/>
	);

	return (
		<div className={ styles.headerActions }>
			<Button
				type="primary"
				icon={ <UnorderedListOutlined/> }
				disabled={ selectedCount === 0 }
				onClick={ onOpenAddTo }
			>
				Add to
			</Button>
			{ !isIgnoredScope ? (
				<Popconfirm
					title={ getLibraryIgnoreConfirmationTitle(selectedCount) }
					description="Ignored items will move out of Library and can be reviewed from Ignored content."
					okText="Ignore"
					cancelText="Cancel"
					okButtonProps={ { danger: true } }
					disabled={ selectedCount === 0 || isIgnoringSelected }
					onConfirm={ onIgnoreSelected }
				>
					<Button
						danger
						icon={ <EyeInvisibleOutlined/> }
						disabled={ selectedCount === 0 }
						loading={ isIgnoringSelected }
					>
						Ignore
					</Button>
				</Popconfirm>
			) : null }
			<Popover
				content={ filterMenu }
				placement="bottomRight"
				trigger="click"
			>
				<Button
					icon={ <FilterOutlined/> }
					aria-label="Filters"
				/>
			</Popover>
			<Input
				className={ styles.searchInput }
				placeholder={ getLibrarySearchPlaceholder(isIgnoredScope) }
				prefix={ <SearchOutlined/> }
				allowClear
				value={ draftSearch }
				onChange={ (event) => handleSearchDraftChange(event.target.value) }
			/>
		</div>
	);
};

export default LibraryHeaderActions;
