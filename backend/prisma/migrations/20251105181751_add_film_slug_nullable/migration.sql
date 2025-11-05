/*
  Warnings:

  - You are about to drop the column `passwordHash` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Film" ADD COLUMN "originalTitle" TEXT;
ALTER TABLE "Film" ADD COLUMN "runtimeMin" INTEGER;
ALTER TABLE "Film" ADD COLUMN "slug" TEXT;

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "photoUrl" TEXT,
    "bio" TEXT,
    "bornAt" DATETIME,
    "diedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StreamingPlatform" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FilmGenre" (
    "filmId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    PRIMARY KEY ("filmId", "genreId"),
    CONSTRAINT "FilmGenre_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmTag" (
    "filmId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    PRIMARY KEY ("filmId", "tagId"),
    CONSTRAINT "FilmTag_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmPerson" (
    "filmId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ACTOR',
    "characterName" TEXT,
    "billingOrder" INTEGER,

    PRIMARY KEY ("filmId", "personId", "role"),
    CONSTRAINT "FilmPerson_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmPerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FilmAvailability" (
    "filmId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "region" TEXT,
    "lastCheck" DATETIME,

    PRIMARY KEY ("filmId", "platformId", "type"),
    CONSTRAINT "FilmAvailability_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Film" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FilmAvailability_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "StreamingPlatform" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "isSupporter" BOOLEAN NOT NULL DEFAULT false,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("avatarUrl", "createdAt", "description", "email", "id", "isPrivate", "isSupporter", "name", "role", "updatedAt") SELECT "avatarUrl", "createdAt", "description", "email", "id", "isPrivate", "isSupporter", "name", "role", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "StreamingPlatform_slug_key" ON "StreamingPlatform"("slug");

-- CreateIndex
CREATE INDEX "FilmGenre_genreId_idx" ON "FilmGenre"("genreId");

-- CreateIndex
CREATE INDEX "FilmTag_tagId_idx" ON "FilmTag"("tagId");

-- CreateIndex
CREATE INDEX "FilmPerson_personId_role_idx" ON "FilmPerson"("personId", "role");

-- CreateIndex
CREATE INDEX "FilmPerson_filmId_role_billingOrder_idx" ON "FilmPerson"("filmId", "role", "billingOrder");

-- CreateIndex
CREATE INDEX "FilmAvailability_platformId_idx" ON "FilmAvailability"("platformId");
