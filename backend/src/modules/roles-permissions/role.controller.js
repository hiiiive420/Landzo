import { successResponse } from "../../common/responses/apiResponse.js";
import { getPermissionCatalog, listRoles, updateRolePermissions } from "./role.service.js";

export const getRoles = async (_req, res, next) => {
  try {
    res.status(200).json(
      successResponse({
        message: "Roles retrieved",
        data: await listRoles(),
      }),
    );
  } catch (error) {
    next(error);
  }
};

export const getPermissions = (_req, res) => {
  res.status(200).json(
    successResponse({
      message: "Permission catalog retrieved",
      data: getPermissionCatalog(),
    }),
  );
};

export const patchRolePermissions = async (req, res, next) => {
  try {
    const role = await updateRolePermissions({
      roleKey: req.validated.params.roleKey,
      permissions: req.validated.body.permissions,
      actorUserId: req.auth.userId,
    });

    res.status(200).json(
      successResponse({
        message: "Role permissions updated",
        data: role,
      }),
    );
  } catch (error) {
    next(error);
  }
};
