
import {
  createUser,
  getAllUsers,
  updateUser,
  deleteUser,
} from "../services/userService.js";

export const createUserController = async (req, res) => {
  try {
    const { name, email, phone, password, roleName } = req.body;

    if (!name || !email || !password || !roleName) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and role are required.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 8 characters.",
      });
    }

    const user = await createUser({
      name,
      email,
      phone,
      password,
      roleName,
    });

    return res.status(201).json({
      success: true,
      message: "Staff account created successfully.",
      data: user,
    });
  } catch (error) {
    const status = error.message.includes("already exists") ? 409 : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllUsersController = async (req, res) => {
  try {
    const users = await getAllUsers();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve staff accounts.",
    });
  }
};

export const updateUserController = async (req, res) => {
  try {
    const user = await updateUser(req.params.id, req.body);

    return res.status(200).json({
      success: true,
      message: "Staff account updated successfully.",
      data: user,
    });
  } catch (error) {
    const status = error.message === "User not found." ? 404 : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteUserController = async (req, res) => {
  try {
    const user = await deleteUser(
      req.params.id,
      req.user?.id
    );

    return res.status(200).json({
      success: true,
      message: "Staff account deleted successfully.",
      data: user,
    });
  } catch (error) {
    const status = error.message === "User not found." ? 404 : 400;

    return res.status(status).json({
      success: false,
      message: error.message,
    });
  }
};
