import type { AnimeDbDownloadProgressData } from "@nimlat/types/ipc-payloads";
import { Typography } from "antd";
import { FC } from "react";
import { resolveDownloadAnimeDbIntroCopy } from "../download-precached-anime-db-model";

interface DownloadAnimeDbIntroProps {
	canSkipToApp: boolean;
	canUseLocalCatalog: boolean;
	isRunning: boolean;
	status: AnimeDbDownloadProgressData["status"];
}

const DownloadAnimeDbIntro: FC<DownloadAnimeDbIntroProps> = (props) => {
	const copy = resolveDownloadAnimeDbIntroCopy(props);

	return (
		<div>
			<Typography.Title level={ 3 }>{ copy.title }</Typography.Title>
			{ copy.description ? (
				<Typography.Paragraph type="secondary">
					{ copy.description }
				</Typography.Paragraph>
			) : null }
		</div>
	);
};

export default DownloadAnimeDbIntro;
