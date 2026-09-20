import { successResponse } from "../../common/responses/apiResponse.js";

import {
  assignEnquiry,
  closeEnquiry,
  createAdminEnquiry,
  createPublicEnquiry,
  getEnquiry,
  listAssignableStaff,
  listEnquiries,
  listEnquiryPropertyOptions,
  updateEnquiry,
} from "./enquiry.service.js";

export const listEnquiriesHandler = async (
  req,
  res,
  next,
) => {
  try {
    const result = await listEnquiries(
      req.validated.query,
    );

    res.status(200).json(
      successResponse({
        message: "Enquiries retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};


export const listAssignableStaffHandler = async (
  _req,
  res,
  next,
) => {
  try {
    const staff = await listAssignableStaff();

    res.status(200).json(
      successResponse({
        message: "Assignable enquiry staff retrieved",
        data: staff,
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const getEnquiryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const enquiry = await getEnquiry(
      req.validated.params.enquiryId,
    );

    res.status(200).json(
      successResponse({
        message: "Enquiry retrieved",
        data: enquiry,
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const listEnquiryPropertyOptionsHandler = async (
  req,
  res,
  next,
) => {
  try {
    const properties = await listEnquiryPropertyOptions(
      req.validated.query,
    );

    res.status(200).json(
      successResponse({
        message: "Enquiry property options retrieved",
        data: properties,
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const createAdminEnquiryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const enquiry = await createAdminEnquiry({
      payload: req.validated.body,
      actorUserId: req.auth.userId,
    });

    res.status(201).json(
      successResponse({
        message: "Enquiry created",
        data: enquiry,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const createPublicEnquiryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const enquiry = await createPublicEnquiry({
      payload: req.validated.body,
    });

    res.status(201).json(
      successResponse({
        message: "Enquiry submitted",
        data: enquiry,
      }),
    );
  } catch (error) {
    next(error);
  }
};
export const updateEnquiryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const enquiry = await updateEnquiry({
      enquiryId: req.validated.params.enquiryId,
      payload: req.validated.body,
      actorUserId: req.auth.userId,
    });

    res.status(200).json(
      successResponse({
        message: "Enquiry updated",
        data: enquiry,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const assignEnquiryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const enquiry = await assignEnquiry({
      enquiryId: req.validated.params.enquiryId,
      assignedTo: req.validated.body.assignedTo,
      actorUserId: req.auth.userId,
    });

    res.status(200).json(
      successResponse({
        message: "Enquiry assignment updated",
        data: enquiry,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const closeEnquiryHandler = async (
  req,
  res,
  next,
) => {
  try {
    const enquiry = await closeEnquiry({
      enquiryId: req.validated.params.enquiryId,
      internalNote: req.validated.body.internalNote,
      actorUserId: req.auth.userId,
    });

    res.status(200).json(
      successResponse({
        message: "Enquiry closed",
        data: enquiry,
      }),
    );
  } catch (error) {
    next(error);
  }
};