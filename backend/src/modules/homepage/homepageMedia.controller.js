import { successResponse } from "../../common/responses/apiResponse.js";

import { serializeAdminHomepage } from "./homepage.serializer.js";

import {
  removeHomepageImage,
  uploadHomepageImage,
} from "./homepageMedia.service.js";

export const uploadHomepageImageHandler =
  (env) => async (req, res, next) => {
    try {
      const homepage =
        await uploadHomepageImage({
          env,

          actorUserId:
            req.auth.userId,

          target:
            req.validated.params.target,

          file: req.file ?? null,

          alt:
            req.validated.body.alt ?? "",
        });

      res.status(200).json(
        successResponse({
          message:
            "Homepage image updated",

          data:
            serializeAdminHomepage(
              homepage,
            ),
        }),
      );
    } catch (error) {
      next(error);
    }
  };

export const removeHomepageImageHandler =
  (env) => async (req, res, next) => {
    try {
      const homepage =
        await removeHomepageImage({
          env,

          actorUserId:
            req.auth.userId,

          target:
            req.validated.params.target,
        });

      res.status(200).json(
        successResponse({
          message:
            "Homepage image removed",

          data:
            serializeAdminHomepage(
              homepage,
            ),
        }),
      );
    } catch (error) {
      next(error);
    }
  };