import { generateUUIDv4 } from "../../shared/util-browser";
import { FrontpageListNewsQuery } from "../../../generated/graphql";

export type NewsGQLResponse = { data: FrontpageListNewsQuery };
type FrontpageListNewsNode = FrontpageListNewsQuery["frontpageListNews"]["nodes"][0];

const FRONTPAGE_LIST_NEWS: FrontpageListNewsNode = {
  id: generateUUIDv4(),
  publishedFrom: "December 17, 1995 03:24:00",
  text: {
    de: "Deutscher Text",
  },
  title: {
    de: "Deutscher Titel",
  },
};

const wrapNewsData = (data: FrontpageListNewsNode[]): NewsGQLResponse => {
  return {
    data: {
      frontpageListNews: {
        nodes: data,
      },
    },
  };
};

/**
 * Generates a valid news
 */
export const buildSingleNewsResponse = (
  override?: FrontpageListNewsNode
): NewsGQLResponse => {
  const news: FrontpageListNewsNode[] = [];
  news.push(Object.assign({}, FRONTPAGE_LIST_NEWS, override || {}));
  return wrapNewsData(news);
};

/**
 * Generates an empty news response
 */
export const buildEmptyNewsResponse = (): NewsGQLResponse => {
  return wrapNewsData([]);
};
