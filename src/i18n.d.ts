/** 支持的语言；`zh` 是源语言（所有文案的原文）。 */
export declare const LOCALES: readonly ["zh", "en"];
export type Locale = (typeof LOCALES)[number];

/** 设语言；认不出的值忽略（保持原语言）。返回生效后的语言。 */
export declare function setLocale(next: string): Locale;

/** 当前语言。 */
export declare function getLocale(): Locale;

/** 是不是英文。 */
export declare function isEnglish(): boolean;

/** 二选一取词：`zh` 源文案 / `en` 英文文案。 */
export declare function pickLabel(zh: string, en: string): string;

/** 带 `{name}` 占位符的取词；两种语言各给一份模板。 */
export declare function pickTemplate(
  zh: string,
  en: string,
  params?: Record<string, string | number>,
): string;
