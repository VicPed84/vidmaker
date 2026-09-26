import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7: connection URLs live here (for Migrate), not in schema.prisma.
// The runtime client connects via the Neon adapter in src/lib/db.ts.
// Migrations prefer Neon's direct (unpooled) URL when it's available; the
// Vercel ↔ Neon integration sets DATABASE_URL_UNPOOLED automatically.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Fallback keeps `prisma generate` (postinstall) working before .env exists.
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});
