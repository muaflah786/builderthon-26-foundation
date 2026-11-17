// REFERENCE SLICE: copy & rename (see docs/COMPETITION_ADAPTATION_GUIDE.md)
import { count, eq } from "drizzle-orm";
import { ITEM_STATUSES } from "@/lib/validation/items";
import type { Db } from "@/server/db/client";
import { items } from "@/server/db/schema/items";
import { ensureDemoUser } from "@/server/db/seeds/demo-user";

const DEMO_ITEM_COUNT = 25;

/** 25 items for the demo user (enough for 2 pages). Skips if they already exist. */
export async function seedItems(db: Db): Promise<void> {
  const ownerId = await ensureDemoUser(db);
  const [{ n }] = await db.select({ n: count() }).from(items).where(eq(items.ownerId, ownerId));
  if (n > 0) return;

  const now = Date.now();
  await db.insert(items).values(
    Array.from({ length: DEMO_ITEM_COUNT }, (_, i) => ({
      ownerId,
      title: `Sample item ${String(i + 1).padStart(2, "0")}`,
      description: i % 3 === 0 ? `Seeded description for item ${i + 1}.` : null,
      status: ITEM_STATUSES[i % ITEM_STATUSES.length],
      // Spread creation times so sorting is visible.
      createdAt: new Date(now - (DEMO_ITEM_COUNT - i) * 60_000),
      updatedAt: new Date(now - (DEMO_ITEM_COUNT - i) * 60_000),
    })),
  );
}
