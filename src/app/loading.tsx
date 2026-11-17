import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="text-muted-foreground flex flex-1 items-center justify-center px-4 py-16">
      <Spinner size="lg" label="Loading" />
    </div>
  );
}
