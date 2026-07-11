import { NewsArticle, NewsCategory, newsArticles } from "@/data/news";

export interface NewsQuery {
  category?: NewsCategory;
}

export async function getNewsArticles(
  query: NewsQuery = {}
): Promise<NewsArticle[]> {
  const { category } = query;

  return category
    ? newsArticles.filter((article) => article.category === category)
    : newsArticles;
}

export async function getNewsArticleById(
  id: string
): Promise<NewsArticle | undefined> {
  return newsArticles.find((article) => article.id === id);
}
