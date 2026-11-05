import express from "express";

import {
  getAllArticlesController,
  getArticleByIdController,
  getArticleBySlugController,
  createArticleController,
  updateArticleController,
  publishArticleController,
  deleteArticleController,
  getPublishedArticlesController,
  getPublishedArticleBySlugController,
  getPublishedCategoriesController,
} from "../controllers/journalController.js";

const router = express.Router();

// Public blog routes
router.get("/public", getPublishedArticlesController);
router.get("/public/categories", getPublishedCategoriesController);
router.get("/public/slug/:slug", getPublishedArticleBySlugController);

// Blog CMS routes
router.get("/", getAllArticlesController);
router.post("/", createArticleController);

router.patch("/:id/publish", publishArticleController);
router.get("/slug/:slug", getArticleBySlugController);
router.get("/:id", getArticleByIdController);
router.put("/:id", updateArticleController);
router.delete("/:id", deleteArticleController);

export default router;