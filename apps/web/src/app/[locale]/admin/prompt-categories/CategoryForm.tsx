'use client';

import { useActionState } from 'react';
import { SUPPORTED_LOCALES } from '@coloring/config/locales';
import type { PromptCategoryFormState } from './types';

interface CategoryFormProps {
  action: (prev: PromptCategoryFormState, formData: FormData) => Promise<PromptCategoryFormState>;
  defaultValues?: {
    slug?: string;
    locale?: string;
    dailyQuota?: number;
    isActive?: boolean;
    stylePreset?: string;
    seedKeywords?: string[];
    negativeKeywords?: string[];
  };
  submitLabel?: string;
}

export function CategoryForm({ action, defaultValues = {}, submitLabel = 'Zapisz' }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.message && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {state.message}
        </div>
      )}

      {/* Slug */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Slug <span className="text-red-500">*</span>
        </label>
        <input
          name="slug"
          defaultValue={defaultValues.slug ?? ''}
          placeholder="np. dinozaury-pl"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {state.errors?.slug && (
          <p className="mt-1 text-xs text-red-600">{state.errors.slug.join(', ')}</p>
        )}
      </div>

      {/* Locale */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Locale <span className="text-red-500">*</span>
        </label>
        <select
          name="locale"
          defaultValue={defaultValues.locale ?? 'en'}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        >
          {SUPPORTED_LOCALES.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        {state.errors?.locale && (
          <p className="mt-1 text-xs text-red-600">{state.errors.locale.join(', ')}</p>
        )}
      </div>

      {/* Daily Quota */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Daily Quota <span className="text-red-500">*</span>
        </label>
        <input
          name="dailyQuota"
          type="number"
          min={1}
          max={1000}
          defaultValue={defaultValues.dailyQuota ?? 10}
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {state.errors?.dailyQuota && (
          <p className="mt-1 text-xs text-red-600">{state.errors.dailyQuota.join(', ')}</p>
        )}
      </div>

      {/* isActive */}
      <div className="flex items-center gap-2">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          defaultChecked={defaultValues.isActive ?? true}
          className="h-4 w-4 rounded border-zinc-300 text-indigo-600"
        />
        <label htmlFor="isActive" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Aktywna
        </label>
      </div>

      {/* Style Preset */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Style Preset
        </label>
        <input
          name="stylePreset"
          defaultValue={defaultValues.stylePreset ?? ''}
          placeholder="np. black and white coloring page, thick outlines..."
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
      </div>

      {/* Seed Keywords */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Seed Keywords <span className="text-xs text-zinc-400">(jedno słowo na linię)</span>
        </label>
        <textarea
          name="seedKeywords"
          rows={5}
          defaultValue={(defaultValues.seedKeywords ?? []).join('\n')}
          placeholder="dinozaur&#10;T-Rex&#10;triceratops"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {state.errors?.seedKeywords && (
          <p className="mt-1 text-xs text-red-600">{state.errors.seedKeywords.join(', ')}</p>
        )}
      </div>

      {/* Negative Keywords */}
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Negative Keywords <span className="text-xs text-zinc-400">(jedno słowo na linię)</span>
        </label>
        <textarea
          name="negativeKeywords"
          rows={3}
          defaultValue={(defaultValues.negativeKeywords ?? []).join('\n')}
          placeholder="kolor&#10;realistyczny&#10;fotografia"
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
        />
        {state.errors?.negativeKeywords && (
          <p className="mt-1 text-xs text-red-600">{state.errors.negativeKeywords.join(', ')}</p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? 'Zapisywanie…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
