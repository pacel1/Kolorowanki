import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n/config';

// Root page – middleware handles the redirect, but this is a fallback
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
