import { successResponse } from "../../common/responses/apiResponse.js";
import { reverseGeocode, searchPlaces } from "./geocoding.service.js";

export const searchPlacesHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Places retrieved",
        data: await searchPlaces(req.validated.query),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const reverseGeocodeHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Place resolved",
        data: await reverseGeocode(req.validated.query),
      }),
    );
  } catch (error) {
    next(error);
  }
};
