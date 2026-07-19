import { readFile } from 'node:fs/promises';

const localeFiles = {
  'zh-CN': new URL('../frontend/src/i18n/locales/zh-CN.json', import.meta.url),
  en: new URL('../frontend/src/i18n/locales/en.json', import.meta.url),
};

const flattenKeys = (value, prefix = '') => Object.entries(value).flatMap(([key, child]) => {
  const path = prefix ? `${prefix}.${key}` : key;
  return child && typeof child === 'object' && !Array.isArray(child) ? flattenKeys(child, path) : [path];
});

const locales = Object.fromEntries(await Promise.all(Object.entries(localeFiles).map(async ([language, url]) => [
  language,
  JSON.parse(await readFile(url, 'utf8')),
])));

const referenceKeys = flattenKeys(locales.en).sort();
const failures = [];

for (const [language, resources] of Object.entries(locales)) {
  const keys = flattenKeys(resources).sort();
  const missing = referenceKeys.filter((key) => !keys.includes(key));
  const unexpected = keys.filter((key) => !referenceKeys.includes(key));
  if (missing.length || unexpected.length) failures.push({ language, missing, unexpected });
}

if (failures.length) {
  console.error('Locale resource keys do not match:', JSON.stringify(failures, null, 2));
  process.exitCode = 1;
} else {
  console.log(`Localization resources are aligned (${referenceKeys.length} keys per language).`);
}
