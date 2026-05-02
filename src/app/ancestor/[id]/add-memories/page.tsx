import Link from "next/link";
import { MemoryUploadForm } from "@/components/MemoryUploadForm";

export default function AddMemoriesPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-echo-ink px-6 py-8 text-echo-cream">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-echo-gold">
          Back to dashboard
        </Link>
        <header className="my-8">
          <h1 className="font-display text-5xl text-echo-gold">
            Add new memories
          </h1>
          <p className="mt-3 text-echo-cream/65">
            Add sources as your family finds old recordings, letters, or stories.
          </p>
        </header>
        <MemoryUploadForm ancestorId={params.id} />
      </div>
    </main>
  );
}
