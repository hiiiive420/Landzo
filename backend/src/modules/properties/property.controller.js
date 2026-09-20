import { successResponse } from "../../common/responses/apiResponse.js";
import {
  createAdminPropertyDraft,
  duplicateAdminProperty,
  getAdminProperty,
  getPublicProperty,
  listAdminProperties,
  listPublicExploreMapProperties,
  listPublicProperties,
  listTrashedAdminProperties,
  publishProperty,
  restoreProperty,
  trashProperty,
  unpublishProperty,
  unarchiveProperty,
  updateAdminProperty,
  updatePropertyExploreMap,
  updatePropertyFeatured,
  updatePropertyStatus,
} from "./property.service.js";

export const createPropertyHandler = async (req, res, next) => {
  try {
    res.status(201).json(
      successResponse({
        message: "Property draft created",
        data: await createAdminPropertyDraft({
          actorUserId: req.auth.userId,
          input: req.validated.body,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const listPropertiesHandler = async (req, res, next) => {
  try {
    const result = await listAdminProperties(req.validated.query);

    res.status(200).json(
      successResponse({
        message: "Properties retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const listPublicPropertiesHandler = async (req, res, next) => {
  try {
    const result = await listPublicProperties(req.validated.query);

    res.status(200).json(
      successResponse({
        message: "Public properties retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const listPublicExploreMapPropertiesHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Public Explore Map properties retrieved",
        data: await listPublicExploreMapProperties(),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getPublicPropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Public property retrieved",
        data: await getPublicProperty(
          req.validated.params.propertyCode,
        ),
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const listTrashedPropertiesHandler = async (req, res, next) => {
  try {
    const result = await listTrashedAdminProperties(req.validated.query);

    res.status(200).json(
      successResponse({
        message: "Trashed properties retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getPropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property retrieved",
        data: await getAdminProperty(req.validated.params.propertyId),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updatePropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property updated",
        data: await updateAdminProperty({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
          input: req.validated.body,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const duplicatePropertyHandler = async (req, res, next) => {
  try {
    res.status(201).json(
      successResponse({
        message: "Property duplicated",
        data: await duplicateAdminProperty({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const trashPropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property moved to trash",
        data: await trashProperty({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const restorePropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property restored",
        data: await restoreProperty({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const publishPropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property published",
        data: await publishProperty({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const unpublishPropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property unpublished",
        data: await unpublishProperty({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updatePropertyFeaturedHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property featured flag updated",
        data: await updatePropertyFeatured({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
          featured: req.validated.body.featured,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updatePropertyExploreMapHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property Explore Map flag updated",
        data: await updatePropertyExploreMap({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
          exploreMapEnabled: req.validated.body.exploreMapEnabled,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const unarchivePropertyHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property unarchived",
        data: await unarchiveProperty({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const updatePropertyStatusHandler = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Property status updated",
        data: await updatePropertyStatus({
          actorUserId: req.auth.userId,
          propertyId: req.validated.params.propertyId,
          status: req.validated.body.status,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

