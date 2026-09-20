import { successResponse } from "../../common/responses/apiResponse.js";

import {
  serializeAdminHomepage,
  serializePublicHomepage,
} from "./homepage.serializer.js";

import {
  getOrCreateHomepage,
  updateHomepage,
} from "./homepage.service.js";

export const getAdminHomepageHandler = async (
  req,
  res,
  next,
) => {
  try {
    const homepage = await getOrCreateHomepage({
      userId: req.auth.userId,
    });

    res.status(200).json(
      successResponse({
        message: "Homepage retrieved",
        data: serializeAdminHomepage(homepage),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updateHomepageHandler = async (
  req,
  res,
  next,
) => {
  try {
    const homepage = await updateHomepage({
      userId: req.auth.userId,
      input: req.validated.body,
    });

    res.status(200).json(
      successResponse({
        message: "Homepage updated",
        data: serializeAdminHomepage(homepage),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getPublicHomepageHandler = async (
  req,
  res,
  next,
) => {
  try {
    const homepage = await getOrCreateHomepage();

    res.status(200).json(
      successResponse({
        message: "Homepage retrieved",
        data: serializePublicHomepage(homepage),
      }),
    );
  } catch (error) {
    next(error);
  }
};