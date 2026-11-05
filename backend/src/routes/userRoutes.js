import express from "express";

import {
  createUserController,
  getAllUsersController,
  updateUserController,
  deleteUserController,
} from "../controllers/userController.js";

const router = express.Router();

// Staff management
router.get("/", getAllUsersController);
router.post("/", createUserController);
router.put("/:id", updateUserController);
router.delete("/:id", deleteUserController);

export default router;