import {
	BugOutlined,
	LoadingOutlined,
} from "@ant-design/icons";
import type { ButtonProps } from "antd/es/button";
import Button from "antd/es/button";
import { forwardRef } from "react";
import {
	joinPlaybackIssueEditorClassNames,
	type PlaybackIssueButtonVariant,
} from "../playback-issue-editor-model";
import styles from "../PlaybackIssueEditorPopover.module.css";

interface PlaybackIssueEditorTriggerButtonProps extends Omit<ButtonProps, "children" | "icon" | "size" | "type"> {
	buttonVariant: PlaybackIssueButtonVariant;
	hasPlaybackIssue: boolean;
	isSaving: boolean;
	resolvedButtonLabel: string;
	shouldRenderButtonLabel: boolean;
}

const PlaybackIssueEditorTriggerButton = forwardRef<HTMLAnchorElement | HTMLButtonElement, PlaybackIssueEditorTriggerButtonProps>(
	(
		{
			buttonVariant,
			className,
			hasPlaybackIssue,
			isSaving,
			resolvedButtonLabel,
			shouldRenderButtonLabel,
			...buttonProps
		},
		ref,
	) => (
		<Button
			{ ...buttonProps }
			ref={ ref }
			size="small"
			icon={ isSaving ? <LoadingOutlined/> : <BugOutlined/> }
			type={ hasPlaybackIssue ? "primary" : "default" }
			className={ joinPlaybackIssueEditorClassNames(
				styles.triggerButton,
				className,
				buttonVariant === "vertical" && styles.triggerButtonVertical,
				buttonVariant === "iconOnly" && styles.triggerButtonIconOnly,
				hasPlaybackIssue && styles.triggerButtonActive,
			) }
			data-glitch={ resolvedButtonLabel }
		>
			{ shouldRenderButtonLabel ? resolvedButtonLabel : null }
		</Button>
	),
);

PlaybackIssueEditorTriggerButton.displayName = "PlaybackIssueEditorTriggerButton";

export default PlaybackIssueEditorTriggerButton;
