-- AlterTable
ALTER TABLE "Artwork" ALTER COLUMN "title" DROP NOT NULL;

-- AlterTable
ALTER TABLE "PlatformConfig" ALTER COLUMN "maxArtworksPerRelease" SET DEFAULT 7;
