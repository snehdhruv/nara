export interface EpisodesVariables {
  uri: string;
  offset?: number;
  limit?: number;
  market?: string;
  lang?: string;
  cursor?: string;
}

export function buildEpisodesVariables(
  showId: string, 
  options: {
    offset?: number;
    limit?: number;
    market?: string;
    lang?: string;
    cursor?: string;
  } = {}
): EpisodesVariables {
  const variables: EpisodesVariables = {
    uri: `spotify:show:${showId}`,
    limit: options.limit || 50,
    ...options
  };

  // Only include offset if no cursor
  if (!options.cursor && options.offset !== undefined) {
    variables.offset = options.offset;
  }

  // Add market and lang if provided
  if (options.market) {
    variables.market = options.market;
  }
  
  if (options.lang) {
    variables.lang = options.lang;
  }

  return variables;
}

export interface PathfinderQuery {
  operationName: string;
  variables: EpisodesVariables;
  extensions?: {
    persistedQuery?: {
      version: number;
      sha256Hash: string;
    };
  };
}

export function buildPathfinderQuery(variables: EpisodesVariables): PathfinderQuery {
  return {
    operationName: 'queryPodcastEpisodes',
    variables,
    // Extensions may be required for some queries - inspect from browser
    extensions: {
      persistedQuery: {
        version: 1,
        // This hash may need to be updated based on actual browser requests
        sha256Hash: 'query_hash_placeholder'
      }
    }
  };
}