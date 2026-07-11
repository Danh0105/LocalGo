import {
  HistoricalSite,
  HistoricalSiteRank,
  historicalSites,
} from "@/data/historical-sites";

export interface HistoricalSiteQuery {
  rank?: HistoricalSiteRank;
}

export async function getHistoricalSites(
  query: HistoricalSiteQuery = {}
): Promise<HistoricalSite[]> {
  const { rank } = query;

  return rank
    ? historicalSites.filter((site) => site.rank === rank)
    : historicalSites;
}

export async function getHistoricalSiteById(
  id: string
): Promise<HistoricalSite | undefined> {
  return historicalSites.find((site) => site.id === id);
}
