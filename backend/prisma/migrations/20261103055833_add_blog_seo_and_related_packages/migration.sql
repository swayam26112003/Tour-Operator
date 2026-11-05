-- AlterTable
ALTER TABLE "JournalArticle" ADD COLUMN     "seoDescription" TEXT,
ADD COLUMN     "seoTitle" TEXT;

-- CreateTable
CREATE TABLE "_JournalArticleToPackage" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JournalArticleToPackage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_JournalArticleToPackage_B_index" ON "_JournalArticleToPackage"("B");

-- AddForeignKey
ALTER TABLE "_JournalArticleToPackage" ADD CONSTRAINT "_JournalArticleToPackage_A_fkey" FOREIGN KEY ("A") REFERENCES "JournalArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JournalArticleToPackage" ADD CONSTRAINT "_JournalArticleToPackage_B_fkey" FOREIGN KEY ("B") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
