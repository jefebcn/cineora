CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE TABLE "titles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tmdb_id" INTEGER NOT NULL,
  "type" VARCHAR(10) NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "original_name" TEXT,
  "overview" TEXT NOT NULL DEFAULT '',
  "release_date" DATE,
  "vote_average" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "vote_count" INTEGER NOT NULL DEFAULT 0,
  "popularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "poster_path" TEXT,
  "backdrop_path" TEXT,
  "trend_rank" INTEGER,
  "language" VARCHAR(10),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "titles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "titles_type_check" CHECK ("type" IN ('movie','tv'))
);
CREATE UNIQUE INDEX "titles_type_tmdb_id_key" ON "titles"("type", "tmdb_id");
CREATE UNIQUE INDEX "titles_slug_key" ON "titles"("slug");
CREATE INDEX "titles_type_popularity_idx" ON "titles"("type", "popularity" DESC);
CREATE INDEX "titles_type_trend_rank_idx" ON "titles"("type", "trend_rank");
CREATE INDEX "titles_created_at_idx" ON "titles"("created_at" DESC);
CREATE INDEX "titles_name_trgm_idx" ON "titles" USING GIN ("name" gin_trgm_ops);

CREATE TABLE "genres" (
  "id" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "title_genres" (
  "title_id" UUID NOT NULL,
  "genre_id" INTEGER NOT NULL,
  CONSTRAINT "title_genres_pkey" PRIMARY KEY ("title_id","genre_id")
);
CREATE TABLE "seasons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "title_id" UUID NOT NULL,
  "season_number" INTEGER NOT NULL,
  "tmdb_id" INTEGER,
  "name" TEXT NOT NULL,
  "overview" TEXT NOT NULL DEFAULT '',
  "air_date" DATE,
  "poster_path" TEXT,
  CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "seasons_title_id_season_number_key" ON "seasons"("title_id","season_number");
CREATE TABLE "episodes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "season_id" UUID NOT NULL,
  "episode_number" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  "overview" TEXT NOT NULL DEFAULT '',
  "air_date" DATE,
  "still_path" TEXT,
  "duration" INTEGER,
  CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "episodes_season_id_episode_number_key" ON "episodes"("season_id","episode_number");
CREATE TABLE "sync_runs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "kind" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "processed" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finished_at" TIMESTAMP(3),
  CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "sync_runs_started_at_idx" ON "sync_runs"("started_at" DESC);
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "title_genres" ADD CONSTRAINT "title_genres_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE CASCADE ON UPDATE CASCADE;
