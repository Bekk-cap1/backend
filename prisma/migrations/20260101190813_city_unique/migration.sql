/*
  Warnings:

  - A unique constraint covering the columns `[name,countryCode]` on the table `City` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "City_name_countryCode_key" ON "City"("name", "countryCode");
