'use client'

export default function ClienteLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
      <div className="w-full max-w-4xl space-y-6">
        <div className="space-y-4">
          <div className="h-10 rounded-xl bg-zinc-200 animate-pulse" />
          <div className="h-6 w-3/4 rounded-xl bg-zinc-200 animate-pulse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-[1.25rem] bg-zinc-200 animate-pulse" />
          <div className="h-28 rounded-[1.25rem] bg-zinc-200 animate-pulse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-20 rounded-3xl bg-zinc-200 animate-pulse" />
          <div className="h-20 rounded-3xl bg-zinc-200 animate-pulse" />
          <div className="h-20 rounded-3xl bg-zinc-200 animate-pulse" />
        </div>

        <div className="h-[22rem] rounded-[2rem] bg-zinc-200 animate-pulse" />
      </div>
    </div>
  )
}
