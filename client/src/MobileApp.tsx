import { ArrowRight, FileText, ShieldCheck, Sparkles, Upload } from "lucide-react";

const desktopHref = "/?desktop=1";

export default function MobileApp() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-amber-50 via-orange-50 to-white text-slate-900">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-orange-200/45 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" />

      <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col px-5 pb-8 pt-7">
        <div className="mb-9 flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-sm">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Mobile Experience
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Resume Optimizer</h1>
          </div>
        </div>

        <section className="rounded-3xl border border-amber-100 bg-white/80 p-6 shadow-sm backdrop-blur">
          <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
            You are on the mobile site
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Fast resume fixes from your phone
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Upload your resume, review AI suggestions, and keep your progress synced with your account.
          </p>

          <div className="mt-6 space-y-3">
            <a
              href={desktopHref}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Continue to Full Editor
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="mailto:support@airesume.app"
              className="flex h-12 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Contact Support
            </a>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-3">
          <article className="rounded-2xl border border-amber-100 bg-white/80 p-4 backdrop-blur">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Upload className="h-4 w-4 text-orange-500" />
              One-tap upload
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Pick a PDF directly from your phone storage and start optimization in seconds.
            </p>
          </article>

          <article className="rounded-2xl border border-amber-100 bg-white/80 p-4 backdrop-blur">
            <p className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Same secure account
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Sign in once and continue your edits on laptop or phone without losing changes.
            </p>
          </article>
        </section>

        <p className="mt-auto pt-7 text-center text-[11px] text-slate-500">
          Tip: Add desktop=1 in the URL if you always want the desktop layout on this device.
        </p>
      </main>
    </div>
  );
}