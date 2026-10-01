import { Construction } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/ui/Page";

/** Placeholder for screens delivered in later phases. */
export function ComingSoon({ title, phase, what }: { title: string; phase: number; what: string }) {
  return (
    <>
      <PageHeader title={title} />
      <EmptyState icon={<Construction aria-hidden />} title={`Coming in Phase ${phase}`}>
        {what}
      </EmptyState>
    </>
  );
}
