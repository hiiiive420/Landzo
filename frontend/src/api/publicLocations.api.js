import { publicApiClient } from "./publicApiClient";

export const listPublicLocations = async (params = {}) => {
  const { data } = await publicApiClient.get("/locations", {
    params,
  });

  return data;
};
