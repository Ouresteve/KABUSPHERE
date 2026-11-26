import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <main
      role="status"
      aria-live="polite"
      className="min-h-screen bg-[#F8FAFC] pb-24 text-[#001533] lg:pl-64"
    >
      <div className="sticky top-0 z-30 border-b bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#0047B3]">
            <LoaderCircle className="h-5 w-5 animate-spin" />
          </span>
          <div className="space-y-2">
            <div className="h-3 w-28 animate-pulse rounded bg-blue-100" />
            <div className="h-5 w-44 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-8 lg:px-8">
        <div className="h-36 animate-pulse rounded-3xl bg-gradient-to-r from-[#001533]/90 to-[#0047B3]/75" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-56 animate-pulse rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex gap-4">
                <div className="h-14 w-14 rounded-xl bg-blue-50" />
                <div className="flex-1 space-y-3 pt-1">
                  <div className="h-3 w-24 rounded bg-slate-200" />
                  <div className="h-5 w-36 rounded bg-slate-200" />
                </div>
              </div>
              <div className="mt-7 space-y-3">
                <div className="h-3 w-full rounded bg-slate-100" />
                <div className="h-3 w-4/5 rounded bg-slate-100" />
                <div className="mt-5 h-10 rounded-xl bg-blue-50" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">Loading KABUSphere...</span>
      </div>
    </main>
  );
}
