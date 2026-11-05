
import * as journalService from "../services/journalService.js";

// GET ALL ARTICLES
export const getAllArticlesController = async (req, res) => {
  try {
    const articles = await journalService.getAllArticles(req.query);

    return res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (error) {
    console.error("Get articles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch articles",
    });
  }
};

// GET ARTICLE BY ID
export const getArticleByIdController = async (req, res) => {
  try {
    const article = await journalService.getArticleById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("Get article error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch article",
    });
  }
};

// GET ARTICLE BY SLUG
export const getArticleBySlugController = async (req, res) => {
  try {
    const article = await journalService.getArticleBySlug(req.params.slug);

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("Get article by slug error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch article",
    });
  }
};

// CREATE ARTICLE
export const createArticleController = async (req, res) => {
  try {
    const article = await journalService.createArticle(req.body);

    return res.status(201).json({
      success: true,
      message: "Article created successfully",
      data: article,
    });
  } catch (error) {
    console.error("Create article error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create article",
    });
  }
};

// UPDATE ARTICLE
export const updateArticleController = async (req, res) => {
  try {
    const article = await journalService.updateArticle(
      req.params.id,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Article updated successfully",
      data: article,
    });
  } catch (error) {
    console.error("Update article error:", error);

    if (error.message === "Article not found") {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update article",
    });
  }
};

// PUBLISH ARTICLE
export const publishArticleController = async (req, res) => {
  try {
    const article = await journalService.publishArticle(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Article published successfully",
      data: article,
    });
  } catch (error) {
    console.error("Publish article error:", error);

    if (error.message === "Article not found") {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to publish article",
    });
  }
};

// DELETE ARTICLE
export const deleteArticleController = async (req, res) => {
  try {
    await journalService.deleteArticle(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Article deleted successfully",
    });
  } catch (error) {
    console.error("Delete article error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        message: "Article not found",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to delete article",
    });
  }
};



// GET PUBLISHED ARTICLES (PUBLIC)
export const getPublishedArticlesController = async (req, res) => {
  try {
    const articles = await journalService.getPublishedArticles(req.query);

    return res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (error) {
    console.error("Get published articles error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch published articles",
    });
  }
};

// GET PUBLISHED ARTICLE BY SLUG (PUBLIC)
export const getPublishedArticleBySlugController = async (req, res) => {
  try {
    const article = await journalService.getPublishedArticleBySlug(
      req.params.slug
    );

    if (!article) {
      return res.status(404).json({
        success: false,
        message: "Published article not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("Get published article error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch published article",
    });
  }
};

// GET PUBLISHED BLOG CATEGORIES
export const getPublishedCategoriesController = async (req, res) => {
  try {
    const categories = await journalService.getPublishedCategories();

    return res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.error("Get blog categories error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch blog categories",
    });
  }
};
