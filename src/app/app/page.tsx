import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { siteConfig } from "@/config/site";
import { requireUser } from "@/server/auth/session";

export const metadata: Metadata = { title: "Home" };

/** Signed-in home. Replace with the product's main screen during the competition. */
export default async function AppHomePage() {
  const user = await requireUser();
  const sections = siteConfig.nav.filter((item) => item.auth && item.href !== "/app");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome, {user.name}</h1>
        <Badge variant={user.role === "admin" ? "primary" : "neutral"}>{user.role}</Badge>
      </div>
      {sections.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {sections.map((item) => (
            <Link key={item.href} href={item.href} className="block">
              <Card className="hover:bg-muted transition-colors">
                <CardHeader>
                  <CardTitle>{item.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  Open {item.label}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
