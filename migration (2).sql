CREATE TABLE "source_observations" (
  "id" UUID NOT NULL,
  "source" VARCHAR(120) NOT NULL,
  "source_url" TEXT NOT NULL,
  "title_id" UUID NOT NULL,
  "type" VARCHAR(10) NOT NULL,
  "dataset_type" TEXT NOT NULL,
  "observed_at" TIMESTAMP(3) NOT NULL,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "source_observations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "source_observations_source_url_key" ON "source_observations"("source_url");
CREATE INDEX "source_observations_source_observed_at_idx" ON "source_observations"("source", "observed_at" DESC);
CREATE INDEX "source_observations_title_id_idx" ON "source_observations"("title_id");
ALTER TABLE "source_observations" ADD CONSTRAINT "source_observations_title_id_fkey" FOREIGN KEY ("title_id") REFERENCES "titles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
