export const ANILIST_MEDIA_FIELDS = `
  id
  idMal
  title {
    romaji
    english
    native
  }
  type
  format
  status
  description
  startDate {
    year
    month
    day
  }
  endDate {
    year
    month
    day
  }
  season
  seasonYear
  episodes
  countryOfOrigin
  source
  trailer {
    id
    site
    thumbnail
  }
  updatedAt
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  genres
  averageScore
  meanScore
  popularity
  tags {
    id
    name
    description
    category
    rank
    isGeneralSpoiler
    isMediaSpoiler
  }
  relations {
    edges {
      id
      relationType
      node {
        id
        idMal
        title {
          romaji
          english
          native
        }
        description
        coverImage {
          extraLarge
          large
          medium
          color
        }
        status
        episodes
        nextAiringEpisode {
          episode
          timeUntilAiring
	        }
	        isAdult
	        format
	      }
	    }
	  }
	  isAdult
	  nextAiringEpisode {
    id
    airingAt
    timeUntilAiring
    episode
    mediaId
  }
  airingSchedule {
    nodes {
      id
      airingAt
      timeUntilAiring
      episode
      mediaId
    }
  }
`;
