export interface Product {
  _id: string;
  productName: string;
  productDescription: string;
  productPrice: number;
  discountPrice?: number;
  discountStatus: boolean;
  availabilityStatus: boolean;
  slug: string;
  productImages: {
    url: string;
    caption?: string;
    attribution?: string;
  }[];
  productCategory: {
    _id: string;
    categoryName: string;
  }[];
  productSection: {
    _id: string;
    sectionName: string;
  }[];
  productSize: {
    _id: string;
    sizeName: string;
    abbreviation?: string;
  }[];
  productColor: {
    _id: string;
    colorName: string;
    colorCode?: string;
  }[];
}