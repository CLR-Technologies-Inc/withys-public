import english from '../locales/en/appearance.json';

type AppearanceKey = keyof typeof english;
type AppearanceTranslation = Partial<Record<AppearanceKey, string>>;

/** A missing or untranslated message uses the English bundled with the app. */
export function appearanceText(key: AppearanceKey, translation?: AppearanceTranslation): string {
  const translated = translation?.[key];
  return translated?.trim() ? translated : english[key];
}
