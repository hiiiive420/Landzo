import { publicApiClient } from "./publicApiClient";

export const submitPublicEnquiry = async (payload) => {
  const { data } = await publicApiClient.post("/enquiries", payload);

  return data.data;
};