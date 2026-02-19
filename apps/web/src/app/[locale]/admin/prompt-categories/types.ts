export type PromptCategoryFormState = {
  errors?: Partial<Record<
    'slug' | 'locale' | 'dailyQuota' | 'isActive' | 'stylePreset' | 'seedKeywords' | 'negativeKeywords',
    string[]
  >>;
  message?: string;
};
