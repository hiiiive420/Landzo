import {
  successResponse,
} from "../../common/responses/apiResponse.js";

import {
  serializeAuditLogList,
} from "./audit.serializer.js";

import {
  listAuditLogs,
} from "./audit.query.service.js";

export const listAuditLogsHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result =
      await listAuditLogs(
        req.validated.query,
      );

    const serialized =
      serializeAuditLogList(
        result,
      );

    res.status(200).json(
      successResponse({
        message:
          "Audit logs retrieved",

        data:
          serialized.data,

        meta:
          serialized.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};