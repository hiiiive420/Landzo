import { publicApiClient } from "./publicApiClient";

export const getPublicContactSettings = async () => {
  const { data } = await publicApiClient.get("/settings/contact");

  return data.data;
};