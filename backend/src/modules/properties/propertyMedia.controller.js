import { successResponse } from "../../common/responses/apiResponse.js";
import {
  addPropertyImages,
  removePropertyImage,
  reorderPropertyImages,
  setPropertyImageCover,
} from "./propertyMedia.service.js";

export const uploadPropertyImagesHandler = (env) => async (req, res, next) => {
  try {
    res.status(201).json(
      successResponse({
        message: "Property images uploaded",
        data: await addPropertyImages({
          env,
          propertyId: req.validated.params.propertyId,
          files: req.files,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const deletePropertyImageHandler = (env) => async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property image removed",
        data: await removePropertyImage({
          env,
          propertyId: req.validated.params.propertyId,
          imageId: req.validated.params.imageId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const setPropertyImageCoverHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property cover image updated",
        data: await setPropertyImageCover({
          propertyId: req.validated.params.propertyId,
          imageId: req.validated.params.imageId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const reorderPropertyImagesHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property images reordered",
        data: await reorderPropertyImages({
          propertyId: req.validated.params.propertyId,
          imageIds: req.validated.body.imageIds,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};
