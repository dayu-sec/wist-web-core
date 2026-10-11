// 管理面 Bearer token 的**传输机制**（与具体服务无关）。
//
// 为什么在这里：`wist-center-web` 与 `wist-gateway-web` 的 `src/api/admin.ts` 里，
// 「token 存哪 / 怎么发 / 401 与 429 怎么判 / `{error:{code,message}}` 信封怎么拆」
// 是**逐字相同**的一份；差异只有 storage key 与变更事件名。这里收敛成一份，差异参数化。
//
// 边界（与包 README 的定位一致）：**只抽机制，不抽客户端**。
//   - 收进来：token 存取 + 变更通知、统一错误类型、401/429 归类、错误信封解析。
//   - 不收进来：各服务的端点函数、视图类型、`requestJson` 的实作（超时 / 重试 / 示例回落
//     各 app 不同），以及 React 组件与样式。
//
// 不含 fetch；浏览器全局（`window` / `sessionStorage` / `Event`）都用 `typeof window` 兜底，
// 所以也能在 Node 里 import 与单测（无 window 时退化为纯内存）。

/**
 * 管理接口错误的统一类型：状态码 + 稳定 `code` + 可展示 `detail` + 429 的 `retryAfterSeconds`。
 *
 * `detail` 来自后端统一信封 `{ "error": { code, message } }` 的 `message`（解不出则回退正文原文）。
 * 有些失败只有后端知道原因（例如「摘要与来源内容不符」），只带状态码的话页面只能给笼统提示。
 */
export class AdminApiError extends Error {
  /**
   * @param {number} status  HTTP 状态码。
   * @param {string} path    请求路径（用于兜底文案与排障）。
   * @param {{ code?: string, detail?: string, retryAfterSeconds?: number }} [options]
   */
  constructor(status, path, options = {}) {
    const { code, detail, retryAfterSeconds } = options;
    super(detail ? `HTTP ${status} ${path}：${detail}` : `HTTP ${status} ${path}`);
    this.name = "AdminApiError";
    this.status = status;
    this.path = path;
    this.code = code;
    this.detail = detail;
    /** 仅 429：距解除封禁的秒数（来自 `Retry-After`，缺省 60）。 */
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * 造一个管理 token 的存取器（各 app 用不同的 key / 事件名）。
 *
 * token 存在 `sessionStorage`：survives 页面重载，关掉标签页即清。
 * 变更时在 `window` 上派发 `authChangedEvent`，供 UI / 查询缓存订阅刷新。
 *
 * @param {{ storageKey: string, authChangedEvent: string }} options
 */
export function createAdminAuth(options) {
  const { storageKey, authChangedEvent } = options ?? {};
  if (!storageKey) {
    throw new TypeError("createAdminAuth: `storageKey` is required");
  }
  if (!authChangedEvent) {
    throw new TypeError("createAdminAuth: `authChangedEvent` is required");
  }

  const hasWindow = typeof window !== "undefined";
  let token = hasWindow ? window.sessionStorage.getItem(storageKey) : null;

  function getAdminApiToken() {
    return token;
  }

  function setAdminApiToken(next) {
    const trimmed = typeof next === "string" ? next.trim() : "";
    token = trimmed || null;
    if (hasWindow) {
      if (token) {
        window.sessionStorage.setItem(storageKey, token);
      } else {
        window.sessionStorage.removeItem(storageKey);
      }
      window.dispatchEvent(new Event(authChangedEvent));
    }
  }

  function clearAdminApiToken() {
    setAdminApiToken("");
  }

  return {
    getAdminApiToken,
    setAdminApiToken,
    clearAdminApiToken,
    /** 传入的变更事件名（原样返回，便于各 app 导出为常量）。 */
    authChangedEvent,
  };
}

/** 是不是「认证失败次数过多」的 429（限流封禁）。 */
export function isRateLimitedError(error) {
  return error instanceof AdminApiError && error.status === 429;
}

/** 是不是 401（缺 / 错 Admin Token）：不该回落到示例数据 —— 那是「没鉴权」，不是「后端不可用」。 */
export function isUnauthorizedError(error) {
  return error instanceof AdminApiError && error.status === 401;
}

/** 错误正文的截断上限：信封解不出时按纯文本用；超长正文只留开头，别把整坨塞进页面。 */
const ERROR_DETAIL_MAX = 300;

/**
 * 读取错误响应：优先解析后端统一信封 `{ "error": { code, message } }`，取 `message` 作 detail、
 * `code` 作稳定码；解不出（旧构建 / 代理截断 / 纯文本）就回退**截断**原文。失败都不影响原始错误。
 *
 * @param {{ text(): Promise<string> }} response 只用到 `text()`（`Response` 结构兼容）。
 * @returns {Promise<{ code?: string, detail?: string }>}
 */
export async function readAdminApiError(response) {
  try {
    const text = (await response.text()).trim();
    if (!text) return {};
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === "object" && parsed !== null) {
        const envelope = parsed.error;
        if (typeof envelope === "object" && envelope !== null) {
          return {
            code: typeof envelope.code === "string" ? envelope.code : undefined,
            detail: typeof envelope.message === "string" ? envelope.message : undefined,
          };
        }
      }
    } catch {
      // 不是 JSON：当作纯文本。
    }
    return {
      detail: text.length > ERROR_DETAIL_MAX ? `${text.slice(0, ERROR_DETAIL_MAX)}…` : text,
    };
  } catch {
    return {};
  }
}
