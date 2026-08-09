import { sanityClient } from "../../lib/sanity.js";
import type { Product } from "./product.schema.js";
const PRODUCT_FIELDS = `
  _id,
  productName,
  productDescription,
  productPrice,
  discountPrice,
  discountStatus,
  availabilityStatus,
  "slug": slug.current,

  productImages[]{
    caption,
    attribution,
    "url": asset->url
  },

  productCategory[]->{
    _id,
    categoryName
  },

  productSection[]->{
    _id,
    sectionName
  },

  productSize[]->{
    _id,
    sizeName,
    abbreviation
  },

  productColor[]->{
    _id,
    colorName,
    colorCode
  }
`;
export async function getProductById(id: string):Promise<Product | null> {
  return sanityClient.fetch(
    `*[_type == "product" && _id == $id][0]{
 ${PRODUCT_FIELDS}}`,
    { id },
  );
}

export async function getAllProducts(): Promise<Product[]> {
  return sanityClient.fetch(`
    *[_type == "product"] | order(_createdAt desc){
    ${PRODUCT_FIELDS}
    }
  `);
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  return sanityClient.fetch<Product[]>(
    `
    *[_type == "product" && _id in $ids]{
  ${PRODUCT_FIELDS}
    }
    `,
    { ids },
  );
}
