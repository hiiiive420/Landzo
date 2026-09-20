import { successResponse } from "../../common/responses/apiResponse.js";
import {
  createStaffUser,
  getStaffUser,
  listStaffUsers,
  resetStaffPassword,
  updateStaffRole,
  updateStaffStatus,
  updateStaffUser,
} from "./user.service.js";

export const createUser = async (req, res, next) => {
  try {
    const user = await createStaffUser({
      actorUserId: req.auth.userId,
      actorRole: req.auth.role,
      input: req.validated.body,
    });

    res.status(201).json(successResponse({ message: "Staff user created", data: user }));
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req, res, next) => {
  try {
    const result = await listStaffUsers(req.validated.query);

    res.status(200).json(
      successResponse({
        message: "Staff users retrieved",
        data: result.data,
        meta: result.meta,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getUser = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Staff user retrieved",
        data: await getStaffUser(req.validated.params.userId),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Staff user updated",
        data: await updateStaffUser({
          actorUserId: req.auth.userId,
          userId: req.validated.params.userId,
          input: req.validated.body,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const changeUserRole = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Staff role updated",
        data: await updateStaffRole({
          actorUserId: req.auth.userId,
          actorRole: req.auth.role,
          targetUserId: req.validated.params.userId,
          nextRole: req.validated.body.role,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const changeUserStatus = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Staff status updated",
        data: await updateStaffStatus({
          actorUserId: req.auth.userId,
          actorRole: req.auth.role,
          targetUserId: req.validated.params.userId,
          nextStatus: req.validated.body.status,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const resetUserPassword = async (req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Staff password reset",
        data: await resetStaffPassword({
          actorUserId: req.auth.userId,
          actorRole: req.auth.role,
          targetUserId: req.validated.params.userId,
          newPassword: req.validated.body.newPassword,
        }),
      }),
    );
  } catch (error) {
    next(error);
  }
};
