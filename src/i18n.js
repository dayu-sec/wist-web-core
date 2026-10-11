/**
 * 共享口径的**语言**开关（zh 源语言 / en 英文）。
 *
 * 为什么放在共享包里：状态、阶段、闸门、筛选这些**文案**是中心与网关两个 app 共用的口径
 * （`planStatusLabel` / `advanceRuleLabel` / `PLAN_STATUS_FILTERS` …）。它们此前只有中文，
 * 于是「英文界面」在每个 app 里各写一套映射 —— 那正是这个包要消灭的重复。
 *
 * 用法：app 启动时 `setLocale(读到的偏好)`，切换语言时再调一次并**触发自己重渲染**
 * （本模块是纯 state，不知道 React；语言变了不会自动重渲染，重渲染由 app 的 store 负责）。
 * 默认 `zh`：任何调用方不设置时，行为与加这个模块之前**完全一致**。
 */

/** 支持的语言；`zh` 是源语言（所有文案的原文）。 */
export const LOCALES = ["zh", "en"];

let current = "zh";

/** 设语言；认不出的值忽略（保持原语言）。返回生效后的语言。 */
export function setLocale(next) {
  if (LOCALES.includes(next)) current = next;
  return current;
}

/** 当前语言。 */
export function getLocale() {
  return current;
}

/** 是不是英文（页面里少量「按语言分叉」的判断用它，别自己比字符串）。 */
export function isEnglish() {
  return current === "en";
}

/**
 * 二选一取词：`zh` 是源文案，`en` 是英文文案。这是本包所有双语文案的唯一取词点
 * —— 别在别处再写一次 `getLocale() === "en" ? … : …`。
 */
export function pickLabel(zh, en) {
  return current === "en" ? en : zh;
}

/** 带 `{name}` 占位符的取词（`{ count: 3 }`）；两种语言各给一份模板。 */
export function pickTemplate(zh, en, params = {}) {
  const template = pickLabel(zh, en);
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}
