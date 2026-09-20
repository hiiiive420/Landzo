import { successResponse } from "../../common/responses/apiResponse.js";
import { serializeMediaLibraryResult } from "./mediaLibrary.serializer.js";
import { listMediaLibraryItems } from "./mediaLibrary.service.js";

export const listMediaLibraryHandler = async (req, res, next) => {
  try {
    const result = await listMediaLibraryItems(req.validated.query);

    res.status(200).json(
      successResponse({
        message: "Media library retrieved",
        data: serializeMediaLibraryResult(result),
      }),
    );
  } catch (error) {
    next(error);
  }
};
