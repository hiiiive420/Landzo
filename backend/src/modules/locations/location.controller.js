import { successResponse } from "../../common/responses/apiResponse.js";
import {
  createLocation,
  getLocation,
  listLocations,
  listPublicLocations,
  updateLocation,
  updateLocationStatus,
} from "./location.service.js";

export const createLocationHandler = async (req, res, next) => {
  try {
    const location = await createLocation({
      actorUserId: req.auth.userId,
      input: req.validated.body,
    });

    res.status(201).json(successResponse({ message: "Location created", data: location }));
  } catch (error) {
    next(error);
  }
};

export const listLocationsHandler = async (req, res, next) => {
  try {
    const result = await listLocations(req.validated.query);

    res.status(200).json(
      successResponse({
        message: "Locations retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const listPublicLocationsHandler = async (req, res, next) => {
  try {
    const result = await listPublicLocations(req.validated.query);

    res.status(200).json(
      successResponse({
        message: "Public locations retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getLocationHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Location retrieved",
        data: await getLocation(req.validated.params.locationId),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updateLocationHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Location updated",
        data: await updateLocation({
          actorUserId: req.auth.userId,
          locationId: req.validated.params.locationId,
          input: req.validated.body,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updateLocationStatusHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Location status updated",
        data: await updateLocationStatus({
          actorUserId: req.auth.userId,
          locationId: req.validated.params.locationId,
          status: req.validated.body.status,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};
