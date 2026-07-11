import { OcopCategory, OcopProduct, ocopProducts } from "@/data/ocop";

export interface OcopQuery {
  category?: OcopCategory;
  rating?: number;
}

export async function getOcopProducts(
  query: OcopQuery = {}
): Promise<OcopProduct[]> {
  const { category, rating } = query;

  return ocopProducts.filter((product) => {
    const matchCategory = category ? product.category === category : true;
    const matchRating = rating ? product.rating === rating : true;

    return matchCategory && matchRating;
  });
}

export async function getOcopProductById(
  id: string
): Promise<OcopProduct | undefined> {
  return ocopProducts.find((product) => product.id === id);
}
