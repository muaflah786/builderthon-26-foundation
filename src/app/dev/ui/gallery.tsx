"use client";

import { Suspense, useState, type ReactNode } from "react";
import { z } from "zod";
import { ApiClientError } from "@/lib/api/client";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { FormError } from "@/components/forms/form-error";
import { FormField } from "@/components/forms/form-field";
import { useApiForm } from "@/components/forms/use-api-form";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { siteConfig } from "@/config/site";

/*
 * Development-only gallery (see page.tsx). Everything below is demo content for
 * eyeballing components; nothing here is used by production pages.
 */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4" aria-labelledby={`s-${title}`}>
      <h2 id={`s-${title}`} className="border-border border-b pb-2 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

const demoSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.email("Enter a valid email"),
  role: z.enum(["user", "admin"]),
  notes: z.string().max(200, "Max 200 characters"),
  terms: z.literal(true, { error: "You must accept the terms" }),
  simulateServerError: z.boolean(),
});

function FormDemo() {
  const { toast } = useToast();
  const form = useApiForm({
    schema: demoSchema,
    // Demo stand-in for `apiFetch`: shows how a server ApiClientError is mapped.
    submit: async (values) => {
      await new Promise((r) => setTimeout(r, 600));
      if (values.simulateServerError) {
        throw new ApiClientError("VALIDATION_ERROR", "Validation failed", 422, {
          email: ["This email is already registered"],
        });
      }
      return values;
    },
    onSuccess: (values, el) => {
      toast({ title: "Saved", description: `Submitted as ${values.name}`, variant: "success" });
      el.reset();
    },
  });

  return (
    <form onSubmit={form.onSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <FormError message={form.formError} />
      <FormField label="Name" name="name" error={form.fieldErrors.name}>
        <Input autoComplete="name" />
      </FormField>
      <FormField
        label="Email"
        name="email"
        error={form.fieldErrors.email}
        hint="We never share it."
      >
        <Input type="email" autoComplete="email" />
      </FormField>
      <FormField label="Role" name="role" error={form.fieldErrors.role}>
        <Select defaultValue="user">
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </Select>
      </FormField>
      <FormField label="Notes" name="notes" error={form.fieldErrors.notes}>
        <Textarea />
      </FormField>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Checkbox id="demo-terms" name="terms" aria-invalid={Boolean(form.fieldErrors.terms)} />
          <Label htmlFor="demo-terms">I accept the terms</Label>
        </div>
        {form.fieldErrors.terms ? (
          <p className="text-danger text-xs font-medium">{form.fieldErrors.terms.join(" ")}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox id="demo-sim" name="simulateServerError" />
        <Label htmlFor="demo-sim">Simulate a server validation error</Label>
      </div>
      <Button type="submit" loading={form.pending} className="self-start">
        Submit
      </Button>
    </form>
  );
}

function DialogDemo() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete this record?"
        description="This action cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => setOpen(false)}>
              Delete
            </Button>
          </>
        }
      >
        Esc, the close button, or a click on the backdrop closes it. Focus returns to the trigger.
      </Dialog>
    </>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      {(["info", "success", "warning", "danger"] as const).map((variant) => (
        <Button
          key={variant}
          variant="secondary"
          size="sm"
          onClick={() =>
            toast({ title: `A ${variant} toast`, description: "Auto-dismisses in 5s.", variant })
          }
        >
          {variant}
        </Button>
      ))}
    </div>
  );
}

export function Gallery() {
  return (
    <ToastProvider>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">UI gallery</h1>
          <p className="text-muted-foreground">
            Every component and variant from <code>src/components</code>. Development only.
          </p>
        </div>

        <Section title="SiteHeader / SiteFooter (AppShell parts)">
          <div className="flex flex-col gap-4">
            <div className="border-border overflow-hidden rounded-md border">
              <SiteHeader appName={siteConfig.name} user={null} nav={siteConfig.nav} />
            </div>
            <div className="border-border overflow-hidden rounded-md border">
              <SiteHeader
                appName={siteConfig.name}
                user={{
                  id: "demo",
                  name: "Demo User",
                  email: "demo@example.com",
                  role: "user",
                  image: null,
                }}
                nav={siteConfig.nav}
                userMenu={<Badge variant="primary">userMenu slot</Badge>}
              />
            </div>
            <div className="border-border overflow-hidden rounded-md border">
              <SiteFooter appName={siteConfig.name} />
            </div>
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Saving</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Inputs">
          <div className="grid max-w-md gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-input">Input</Label>
              <Input id="g-input" placeholder="Placeholder" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-invalid">Invalid input</Label>
              <Input id="g-invalid" aria-invalid defaultValue="bad value" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-disabled">Disabled input</Label>
              <Input id="g-disabled" disabled defaultValue="Disabled" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-textarea">Textarea</Label>
              <Textarea id="g-textarea" placeholder="Write something" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="g-select">Select</Label>
              <Select id="g-select" defaultValue="b">
                <option value="a">Option A</option>
                <option value="b">Option B</option>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="g-check" defaultChecked />
              <Label htmlFor="g-check">Checkbox</Label>
            </div>
          </div>
        </Section>

        <Section title="Form (useApiForm + FormField + FormError)">
          <FormDemo />
        </Section>

        <Section title="Badge">
          <div className="flex flex-wrap gap-2">
            <Badge>Neutral</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
          </div>
        </Section>

        <Section title="Alert">
          <div className="grid gap-3">
            <Alert variant="info" title="Info">
              Something worth knowing.
            </Alert>
            <Alert variant="success" title="Success">
              The change was saved.
            </Alert>
            <Alert variant="warning" title="Warning">
              Check this before continuing.
            </Alert>
            <Alert variant="danger" title="Error">
              Something failed.
            </Alert>
          </div>
        </Section>

        <Section title="Card">
          <Card className="max-w-sm">
            <CardHeader>
              <CardTitle>Card title</CardTitle>
              <CardDescription>Short supporting description.</CardDescription>
            </CardHeader>
            <CardContent>Card body content.</CardContent>
            <CardFooter>
              <Button size="sm">Action</Button>
              <Button size="sm" variant="ghost">
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </Section>

        <Section title="Spinner">
          <div className="text-primary flex items-center gap-4">
            <Spinner size="sm" label="Loading" />
            <Spinner size="md" label="Loading" />
            <Spinner size="lg" label="Loading" />
          </div>
        </Section>

        <Section title="Dialog">
          <div>
            <DialogDemo />
          </div>
        </Section>

        <Section title="Toast">
          <ToastDemo />
        </Section>

        <Section title="Table">
          <Table>
            <TableCaption>Sample rows.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ["First row", "open", 3],
                ["Second row", "done", 12],
              ].map(([title, status, count]) => (
                <TableRow key={String(title)}>
                  <TableCell>{title}</TableCell>
                  <TableCell>
                    <Badge variant={status === "done" ? "success" : "neutral"}>{status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>

        <Section title="EmptyState">
          <EmptyState
            title="Nothing here yet"
            description="Records you create will show up here."
            action={<Button size="sm">Create one</Button>}
            icon={
              <svg viewBox="0 0 24 24" className="size-8" fill="none">
                <path d="M4 7h16v12H4zM4 7l2-3h12l2 3" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            }
          />
        </Section>

        <Section title="Pagination">
          <Suspense fallback={null}>
            <div className="flex flex-col gap-4">
              <Pagination meta={{ page: 1, pageSize: 20, total: 95, totalPages: 5 }} />
              <Pagination meta={{ page: 3, pageSize: 20, total: 95, totalPages: 5 }} />
              <Pagination meta={{ page: 5, pageSize: 20, total: 95, totalPages: 5 }} />
            </div>
          </Suspense>
        </Section>
      </div>
    </ToastProvider>
  );
}
