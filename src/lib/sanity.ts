import { createClient } from "@sanity/client";

// const token = process.env.SANITY_TOKEN;

// if (!token) {
//   throw new Error("SANITY_TOKEN is required");
// }

export const sanityClient = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET!,
  apiVersion: process.env.SANITY_API_VERSION!,
  useCdn: true,
//   token
});