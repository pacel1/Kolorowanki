export default function ColoringDetailLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Breadcrumb skeleton */}
      <div className="h-4 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Image skeleton */}
        <div className="aspect-[4/3] animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />

        {/* Details skeleton */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="h-8 w-3/4 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-full animate-pulse rounded bg-zinc-100 dark:bg-zinc-700" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-zinc-100 dark:bg-zinc-700" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="flex gap-2">
              <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-6 w-16 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-10 w-32 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
