import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { DocsHeader } from "@/components/docs/DocsHeader";
import { DocsSidebar } from "@/components/docs/DocsSidebar";

export const metadata: Metadata = {
  title: "Documentation · Spinneret",
  description:
    "How Spinneret measures its own scrapers, detects drift, writes its own repair prompts and proves the fix worked.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DocsHeader />
      <div className="relative z-10 mx-auto flex max-w-[1440px] gap-12 px-6">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-60 shrink-0 overflow-y-auto py-10 lg:block">
          <DocsSidebar />
        </aside>
        <main className="min-w-0 flex-1 py-12 pb-24">{children}</main>
      </div>
      <Footer />
    </>
  );
}
