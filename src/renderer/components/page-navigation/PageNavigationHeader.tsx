import { useNavigate } from "@tanstack/react-router";
import {
	FC,
	ReactNode,
	useCallback,
} from "react";
import { ROUTES } from "../../constants/route-config";
import PageHeader from "../page-header/PageHeader";
import styles from "./PageNavigationHeader.module.css";

interface PageNavigationHeaderProps {
	title: string;
	rightContent?: ReactNode;
}

const PageNavigationHeader: FC<PageNavigationHeaderProps> = ({
																															 title,
																															 rightContent,
																														 }) => {
	const navigate = useNavigate();
	const onBack   = useCallback(
		() => {
			// Tool pages can be opened from deep inspection routes; browser history is
			// the only source that preserves the exact originating tab and route state.
			if (window.history.length > 1) {
				window.history.back();
				return;
			}

			void navigate({ to: ROUTES.GROUPS.FULL_URL });
		},
		[ navigate ],
	);

	return (
		<div className={ styles.header }>
			<PageHeader
				title={ title }
				onBack={ onBack }
				rightContent={ rightContent }
			/>
		</div>
	);
};

export default PageNavigationHeader;
