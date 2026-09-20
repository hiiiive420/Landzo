import { successResponse } from "../../common/responses/apiResponse.js";

import {
  getAnalyticsSummary,
  recordPublicAnalyticsEvent,
} from "./analytics.service.js";
import { serializeAnalyticsSummary } from "./analytics.serializer.js";

export const createPublicAnalyticsEventHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result = await recordPublicAnalyticsEvent({
      eventType: req.validated.body.eventType,
      propertyId: req.validated.body.propertyId,
      context: req.validated.body.context,
    });

    res.status(201).json(
      successResponse({
        message: "Analytics event recorded",
        data: result,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getAnalyticsSummaryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const summary = await getAnalyticsSummary(
      req.validated.query,
    );

    res.status(200).json(
      successResponse({
        message: "Analytics summary retrieved",
        data: serializeAnalyticsSummary(summary),
      }),
    );
  } catch (error) {
    next(error);
  }
};
