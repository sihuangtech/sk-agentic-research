import languages from './languages.json' with { type: 'json' };

export type Locale = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'pt-BR' | 'ru';
export const supportedLocales = languages.map(({ code }) => code as Locale);
export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && supportedLocales.includes(value as Locale);
}
export function resolveLocale(value?: string | null): Locale {
  const preferences = (value?.split(',') || [])
    .map((part) => {
      const [tag, ...parameters] = part.trim().toLowerCase().replaceAll('_', '-').split(';');
      const quality = parameters.find((parameter) => parameter.trim().startsWith('q='));
      return { tag, quality: quality ? Number(quality.trim().slice(2)) : 1 };
    })
    .filter(({ quality }) => quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality);
  for (const { tag } of preferences) {
    if (tag === 'zh' || tag.startsWith('zh-')) {
      return /(?:^|-)(hant|tw|hk|mo)(?:-|$)/.test(tag) ? 'zh-TW' : 'zh-CN';
    }
    const language = tag.split('-')[0];
    const match = supportedLocales.find(
      (locale) => locale.toLowerCase().split('-')[0] === language,
    );
    if (match) return match;
  }
  return 'zh-CN';
}
