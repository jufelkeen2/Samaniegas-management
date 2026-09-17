-- Add the new fields as nullable so existing clients can be backfilled safely.
ALTER TABLE "Client"
ADD COLUMN "visitDay1" INTEGER,
ADD COLUMN "visitDay2" INTEGER;

-- Reuse each client's first two distinct historical visit days when available.
WITH distinct_days AS (
  SELECT
    "clientId",
    EXTRACT(DAY FROM "scheduledDate")::INTEGER AS visit_day,
    MIN("scheduledDate") AS first_date
  FROM "Visit"
  GROUP BY "clientId", EXTRACT(DAY FROM "scheduledDate")::INTEGER
), ranked_days AS (
  SELECT
    "clientId",
    visit_day,
    ROW_NUMBER() OVER (PARTITION BY "clientId" ORDER BY first_date, visit_day) AS position
  FROM distinct_days
), selected_days AS (
  SELECT
    "clientId",
    MAX(visit_day) FILTER (WHERE position = 1) AS day_1,
    MAX(visit_day) FILTER (WHERE position = 2) AS day_2
  FROM ranked_days
  GROUP BY "clientId"
)
UPDATE "Client" AS client
SET
  "visitDay1" = COALESCE(selected.day_1, 7),
  "visitDay2" = CASE
    WHEN COALESCE(selected.day_2, 21) = COALESCE(selected.day_1, 7)
      THEN CASE WHEN COALESCE(selected.day_1, 7) = 21 THEN 7 ELSE 21 END
    ELSE COALESCE(selected.day_2, 21)
  END
FROM selected_days AS selected
WHERE client.id = selected."clientId";

UPDATE "Client"
SET "visitDay1" = 7, "visitDay2" = 21
WHERE "visitDay1" IS NULL OR "visitDay2" IS NULL;

ALTER TABLE "Client"
ALTER COLUMN "visitDay1" SET DEFAULT 7,
ALTER COLUMN "visitDay1" SET NOT NULL,
ALTER COLUMN "visitDay2" SET DEFAULT 21,
ALTER COLUMN "visitDay2" SET NOT NULL;

ALTER TABLE "Client"
ADD CONSTRAINT "Client_visitDay1_range" CHECK ("visitDay1" BETWEEN 1 AND 31),
ADD CONSTRAINT "Client_visitDay2_range" CHECK ("visitDay2" BETWEEN 1 AND 31),
ADD CONSTRAINT "Client_visitDays_distinct" CHECK ("visitDay1" <> "visitDay2");

CREATE UNIQUE INDEX "Visit_clientId_scheduledDate_key" ON "Visit"("clientId", "scheduledDate");
