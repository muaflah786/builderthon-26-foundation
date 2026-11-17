import type { Metadata } from "next";
import { SetupWizard } from "@/components/ops/setup-wizard";
import { SCENARIO_PACKS } from "@/lib/ops/scenarios/packs";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Start an operation" };

export default async function NewOperationPage() {
  await requireUser();
  const choices = SCENARIO_PACKS.map((p) => ({ id: p.id, name: p.name, example: p.example }));
  return <SetupWizard choices={choices} />;
}
