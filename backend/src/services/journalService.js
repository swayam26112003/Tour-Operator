
import prisma from "../config/database.js";

// GET ALL ARTICLES
export const getAllArticles = async (filters = {}) => {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.category) {
    where.category = filters.category;
  }

  return prisma.journalArticle.findMany({
    where,
    include: {
      relatedPackages: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });
};

// GET ARTICLE BY ID
export const getArticleById = async (id) => {
  return prisma.journalArticle.findUnique({
    where: { id },
    include: {
      relatedPackages: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });
};

// GET ARTICLE BY SLUG
export const getArticleBySlug = async (slug) => {
  return prisma.journalArticle.findUnique({
    where: { slug },
    include: {
      relatedPackages: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });
};

// CREATE ARTICLE
export const createArticle = async (data) => {
  const { relatedPackageIds = [], ...articleData } = data;

  return prisma.journalArticle.create({
    data: {
      ...articleData,
      status: articleData.status || "DRAFT",
      relatedPackages: {
        connect: relatedPackageIds.map((id) => ({ id })),
      },
    },
    include: {
      relatedPackages: true,
    },
  });
};

// UPDATE ARTICLE
export const updateArticle = async (id, data) => {
  const { relatedPackageIds, ...articleData } = data;

  const existingArticle = await prisma.journalArticle.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existingArticle) {
    throw new Error("Article not found");
  }

  return prisma.journalArticle.update({
    where: { id },
    data: {
      ...articleData,
      ...(relatedPackageIds !== undefined && {
        relatedPackages: {
          set: relatedPackageIds.map((packageId) => ({
            id: packageId,
          })),
        },
      }),
    },
    include: {
      relatedPackages: true,
    },
  });
};

// PUBLISH ARTICLE
export const publishArticle = async (id) => {
  const article = await prisma.journalArticle.findUnique({
    where: { id },
    select: { id: true, status: true, publishedAt: true },
  });

  if (!article) {
    throw new Error("Article not found");
  }

  return prisma.journalArticle.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      publishedAt: article.publishedAt || new Date(),
    },
    include: {
      relatedPackages: true,
    },
  });
};

// DELETE ARTICLE
export const deleteArticle = async (id) => {
  return prisma.journalArticle.delete({
    where: { id },
  });
};


// GET PUBLISHED ARTICLES (PUBLIC)
export const getPublishedArticles = async (filters = {}) => {
  const where = {
    status: "PUBLISHED",
  };

  if (filters.category) {
    where.category = filters.category;
  }

  return prisma.journalArticle.findMany({
    where,
    include: {
      relatedPackages: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
    orderBy: {
      publishedAt: "desc",
    },
  });
};

// GET PUBLISHED ARTICLE BY SLUG (PUBLIC)
export const getPublishedArticleBySlug = async (slug) => {
  return prisma.journalArticle.findFirst({
    where: {
      slug,
      status: "PUBLISHED",
    },
    include: {
      relatedPackages: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });
};

// GET PUBLIC BLOG CATEGORIES
export const getPublishedCategories = async () => {
  const articles = await prisma.journalArticle.findMany({
    where: {
      status: "PUBLISHED",
      category: {
        not: null,
      },
    },
    select: {
      category: true,
    },
    distinct: ["category"],
    orderBy: {
      category: "asc",
    },
  });

  return articles
    .map((article) => article.category)
    .filter(Boolean);
};
