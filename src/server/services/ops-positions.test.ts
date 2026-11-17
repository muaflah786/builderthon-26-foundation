import { resetTestDb, setupTestDb } from "@tests/helpers/db";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { suggestSetup } from "@/lib/ops/scenarios/engine";
import { db } from "@/server/db";
import { user } from "@/server/db/schema/auth";
import {
  getCommandView,
  getShareInfo,
  joinOperation,
  launchOperation,
} from "@/server/services/ops";
import { listPositions, sharePosition, stopSharing } from "@/server/services/ops-positions";
import type { SessionUser } from "@/types/auth";

async function makeUser(name: string): Promise<SessionUser> {
  const id = crypto.randomUUID();
  await db.insert(user).values({ id, name, email: `${id}@example.com` });
  return { id, name, email: `${id}@example.com`, role: "user", image: null };
}

beforeAll(() => setupTestDb());
beforeEach(() => resetTestDb());

describe("location sharing", () => {
  it("shares only when asked, is team-scoped, and stop removes it", async () => {
    const org = await makeUser("Olu");
    const a = await makeUser("Ann");
    const b = await makeUser("Ben");
    const stranger = await makeUser("Sam");
    const id = await launchOperation(org, suggestSetup({ situation: "Flood in 2 wards" }).draft);
    const { joinToken } = await getShareInfo(org, id);
    const teams = (await getCommandView(org, id)).teams;
    await joinOperation(a, { token: joinToken, displayName: "Ann", teamId: teams[0].id });
    await joinOperation(b, { token: joinToken, displayName: "Ben", teamId: teams[1].id });

    expect(await listPositions(org, id)).toEqual([]);
    await sharePosition(a, id, { lat: 10.5, lng: 76.2, accuracy: 12 });
    await sharePosition(a, id, { lat: 10.6, lng: 76.3, accuracy: 8 }); // update, not duplicate

    const forOrg = await listPositions(org, id);
    expect(forOrg).toHaveLength(1);
    expect(forOrg[0]).toMatchObject({ name: "Ann", lat: 10.6, lng: 76.3 });
    expect(await listPositions(b, id)).toEqual([]); // other team
    expect((await listPositions(a, id))[0].me).toBe(true);
    await expect(listPositions(stranger, id)).rejects.toMatchObject({ code: "NOT_FOUND" });

    await stopSharing(a, id);
    expect(await listPositions(org, id)).toEqual([]);
  });
});
