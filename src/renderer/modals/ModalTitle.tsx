import type {
	FC,
	ReactNode,
} from "react";
import styles from "./ModalTitle.module.css";

interface ModalTitleProps {
	children: ReactNode;
}

const ModalTitle: FC<ModalTitleProps> = ({ children }) => (
	<div className={ styles.title }>{ children }</div>
);

export default ModalTitle;
