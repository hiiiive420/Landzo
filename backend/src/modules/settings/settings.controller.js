import { successResponse } from "../../common/responses/apiResponse.js";

import { serializePublicContactSettings, serializeSettings } from "./settings.serializer.js";
import { getSettings, updateSettings } from "./settings.service.js";

export const getPublicContactSettingsHandler = async (_req, res, next) => {
  try {
    const settings = await getSettings();

    res.status(200).json(
      successResponse({
        message: "Public contact settings retrieved",
        data: serializePublicContactSettings(settings),
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const getSettingsHandler = async (_req, res, next) => {
  try {
    const settings = await getSettings();

    res.status(200).json(
      successResponse({
        message: "Settings retrieved",
        data: serializeSettings(settings),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updateSettingsHandler = async (req, res, next) => {
  try {
    const settings = await updateSettings({
      actorUserId: req.user.id,
      input: req.validated.body,
    });

    res.status(200).json(
      successResponse({
        message: "Settings updated",
        data: serializeSettings(settings),
      }),
    );
  } catch (error) {
    next(error);
  }
};