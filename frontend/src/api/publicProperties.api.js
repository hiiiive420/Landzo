import { publicApiClient } from "./publicApiClient";

export const listPublicProperties = async (params = {}) => {
  const { data } = await publicApiClient.get("/properties", {
    params,
  });

  return data;
};

export const getPublicProperty = async (propertyCode) => {
  const { data } = await publicApiClient.get(
    `/properties/${propertyCode}`,
  );

  return data.data;
};
export const listPublicExploreMapProperties = async () => {
  const { data } = await publicApiClient.get("/properties/explore-map");

  return data.data ?? [];
};