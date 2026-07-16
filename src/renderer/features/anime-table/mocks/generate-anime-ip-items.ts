// import {
// 	AnimeEpisode,
// 	AnimeGroup,
// 	AnimeMedia,
// } from "@nimlat/types/nimlat-anime";
//
// export function generateAnimeIpItems(count: number): AnimeGroup[] {
// 	return Array.from(
// 		{ length: count },
// 		(_, groupIndex) => {
// 			const completion     = Math.random() * 100;
// 			const statusCategory = completion < 50 ? "uncompleted" : completion < 100
// 				? "partially_completed"
// 				: Math.random() > 0.1 ? "fully_integrated" : "ignored";
// 			return {
// 				id:          groupIndex,
// 				name:        `Anime Group ${ groupIndex }`,
// 				description: `Description for Group ${ groupIndex }`,
// 				image:       `https://via.placeholder.com/200x300?text=Group${ groupIndex }`,
// 				medias:      Array.from(
// 					{ length: Math.floor(Math.random() * 5) + 1 },
// 					(_, mediasIndex): AnimeMedia => ({
// 						id:          `${ groupIndex }-${ mediasIndex }`,
// 						title:       `Series ${ mediasIndex + 1 } (Group ${ groupIndex })`,
// 						releaseDate: `202${ groupIndex % 10 }-${ String(mediasIndex + 1).padStart(
// 							2,
// 							"0",
// 						) }-01`,
// 						episodes:    Array.from(
// 							{ length: Math.floor(Math.random() * 10) + 1 },
// 							(_, episodeIndex): AnimeEpisode => ({
// 								id: `${ groupIndex }-${ mediasIndex }-${ episodeIndex }`,
// 								title:         `Episode ${ episodeIndex + 1 }`,
// 								episodeNumber: episodeIndex + 1,
// 								status:        {
// 									downloaded:     Math.random() > 0.5,
// 									renamed:        Math.random() > 0.5,
// 									plexRecognized: Math.random() > 0.5,
// 									issues:         Math.random() > 0.5,
// 									ready:          Math.random() > 0.5,
// 									ignored:        Math.random() > 0.5,
// 									notes:          "",
// 								},
// 							}),
// 						),
// 						completion:  Math.random() * 100,
// 						status:      {
// 							downloaded:     Math.random() > 0.5,
// 							renamed:        Math.random() > 0.5,
// 							plexRecognized: Math.random() > 0.5,
// 							issues:         Math.random() > 0.5,
// 							ready:          Math.random() > 0.5,
// 							ignored:        Math.random() > 0.5,
// 							notes:          "",
// 						},
// 					}),
// 				),
// 				completion,
// 				status:      {
// 					downloaded:     Math.random() > 0.5,
// 					renamed:        Math.random() > 0.5,
// 					plexRecognized: Math.random() > 0.5,
// 					issues:         Math.random() > 0.5,
// 					ready:          statusCategory === "fully_integrated",
// 					ignored:        statusCategory === "ignored",
// 					notes:          "",
// 				},
// 				lastRefresh: "2025-04-24T09:00:00Z",
// 			};
// 		},
// 	);
// }
