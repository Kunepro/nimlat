import { ExportOutlined } from "@ant-design/icons";
import type {
	FC,
	MouseEvent,
} from "react";
import { ExternalNavigationFacade } from "../../../facades";
import type { MediaHeroDetailGroup } from "./media-details-hero-model";
import styles from "./MediaDetailsHero.module.css";

interface MediaDetailsHeroDetailsProps {
	detailGroups: MediaHeroDetailGroup[];
}

function openExternalLink(event: MouseEvent<HTMLAnchorElement>, href: string): void {
	event.preventDefault();
	void ExternalNavigationFacade.openExternalUrl(href);
}

const MediaDetailsHeroDetails: FC<MediaDetailsHeroDetailsProps> = ({ detailGroups }) => {
	if (detailGroups.length === 0) {
		return null;
	}

	return (
		<aside
			className={ styles.detailsColumn }
			aria-label="Media details"
		>
			{ detailGroups.map(group => (
				<section
					key={ group.title }
					className={ styles.detailGroup }
				>
					<h3 className={ styles.detailHeading }>{ group.title }</h3>
					<dl className={ styles.factList }>
						{ group.facts.map((fact) => {
							const href = fact.href;

							return (
								<div
									key={ fact.label }
									className={ styles.fact }
								>
									<dt className={ styles.factLabel }>{ fact.label }</dt>
									<dd className={ styles.factValue }>
										{ href ? (
											<a
												className={ styles.factLink }
												href={ href }
												onClick={ event => openExternalLink(
													event,
													href,
												) }
												aria-label={ fact.ariaLabel }
											>
												<span>{ fact.value }</span>
												<ExportOutlined
													className={ styles.factLinkIcon }
													aria-hidden="true"
												/>
											</a>
										) : fact.value }
									</dd>
								</div>
							);
						}) }
					</dl>
				</section>
			)) }
		</aside>
	);
};

export default MediaDetailsHeroDetails;
