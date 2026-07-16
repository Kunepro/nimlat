import { Typography } from "antd";
import { FC } from "react";

const PopulationIntro: FC = () => (
	<div>
		<Typography.Title level={ 3 }>Populate Official Anime DB</Typography.Title>
		<Typography.Paragraph type="secondary">
			Scan the anime catalog and write missing or refreshed entries into the local
			AnimeDB. If the catalog is empty, the scan starts from the beginning.
		</Typography.Paragraph>
	</div>
);

export default PopulationIntro;
