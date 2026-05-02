import Link from "next/link";
import { RecorderStudio } from "@/components/RecorderStudio";

export default function RecordPage({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-echo-ink px-6 py-8 text-echo-cream">
      <div className="mx-auto max-w-4xl">
        <Link href="/dashboard" className="text-sm text-echo-gold">
          Back to dashboard
        </Link>
        <header className="my-8">
          <h1 className="font-display text-5xl text-echo-gold">
            Voice recording studio
          </h1>
          <p className="mt-3 text-echo-cream/65">
            A quiet place for living elders to record the stories their family
            will need later.
          </p>
        </header>
        <RecorderStudio ancestorId={params.id} />
      </div>
    </main>
  );
}
