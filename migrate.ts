import "dotenv/config";
import { prisma } from "./lib/prisma";

async function main() {
  console.log("Creating profiles table...");
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "profiles" (
      "id" UUID NOT NULL,
      "date_of_birth" DATE,
      "blood_group" TEXT,
      "address" TEXT,
      "national_id" TEXT,
      "father_name" TEXT,
      "mother_name" TEXT,
      "emergency_contact_name" TEXT,
      "emergency_contact_phone" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL,
      CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
    );
  `);

  console.log("Adding foreign key constraint...");
  try {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    `);
  } catch (e: any) {
    console.log("Foreign key constraint might already exist.", e.message);
  }

  console.log("Migrating data from students to profiles...");
  await prisma.$executeRawUnsafe(`
    INSERT INTO "profiles" ("id", "date_of_birth", "blood_group", "address", "national_id", "father_name", "mother_name", "emergency_contact_name", "emergency_contact_phone", "updated_at")
    SELECT "id", "date_of_birth", "blood_group", "address", "national_id", "father_name", "mother_name", "emergency_contact_name", "emergency_contact_phone", CURRENT_TIMESTAMP
    FROM "students"
    ON CONFLICT ("id") DO NOTHING;
  `);

  console.log("Data migration complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    // nothing to disconnect if we just exit
  });
