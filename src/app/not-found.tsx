import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <Link
        href="/"
        className="min-h-12 rounded-xl bg-accent px-6 py-3 font-semibold text-accent-fg"
      >
        Go to Home
      </Link>
    </main>
  );
}
