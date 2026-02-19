export default function Loading() {
  return (
    <div className="flex flex-col gap-12">
      <div className="animate-pulse rounded-2xl bg-zinc-200 px-8 py-12 dark:bg-zinc-800">
        <div className="h-9 w-2/3 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
        <div className="mt-3 h-5 w-1/2 rounded-lg bg-zinc-300 dark:bg-zinc-700" />
      </div>
      <section>
        <div className="mb-6 h-6 w-40 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
      <section>
        <div className="mb-6 h-6 w-48 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
      <div className="aspect-[4/3] bg-zinc-200 dark:bg-zinc-800" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-5 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
        <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
        <div className="h-9 w-full rounded-lg bg-zinc-200 dark:bg-zinc-700" />
      </div>
    </div>
  );
}
