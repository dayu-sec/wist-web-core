/** 造管理 token 存取器的入参（各 app 的 key / 事件名不同）。 */
export interface CreateAdminAuthOptions {
  /** `sessionStorage` 的键（如 `warpInsightAdminApiToken` / `warpInsightCenterApiToken`）。 */
  storageKey: string;
  /** token 变更时在 `window` 上派发的自定义事件名（各 app 不同）。 */
  authChangedEvent: string;
}

/** 管理 token 的存取器：`get / set / clear` + 变更事件名。 */
export interface AdminAuth {
  /** 当前 token；未设置则 `null`。 */
  getAdminApiToken(): string | null;
  /** 设 token（去掉首尾空白；空串即清除）；会派发变更事件。 */
  setAdminApiToken(token: string): void;
  /** 清除 token（等价 `setAdminApiToken("")`）。 */
  clearAdminApiToken(): void;
  /** 传入的变更事件名（原样返回，便于各 app 导出为常量）。 */
  readonly authChangedEvent: string;
}

/** 造一个管理 token 存取器；缺 `storageKey` / `authChangedEvent` 会抛 `TypeError`。 */
export declare function createAdminAuth(options: CreateAdminAuthOptions): AdminAuth;

/** `AdminApiError` 的可选字段。 */
export interface AdminApiErrorOptions {
  /** 稳定错误码（来自 `{error:{code,message}}` 信封）。 */
  code?: string;
  /** 可展示短文案（信封的 `message`；非信封回落正文原文）。 */
  detail?: string;
  /** 仅 429：距解除封禁的秒数。 */
  retryAfterSeconds?: number;
}

/** 管理接口错误的统一类型：状态码 + 稳定 `code` + 可展示 `detail` + 429 的 `retryAfter`。 */
export declare class AdminApiError extends Error {
  readonly status: number;
  readonly path: string;
  readonly code?: string;
  readonly detail?: string;
  readonly retryAfterSeconds?: number;
  constructor(status: number, path: string, options?: AdminApiErrorOptions);
}

/** 是不是「认证失败次数过多」的 429（限流封禁）。 */
export declare function isRateLimitedError(error: unknown): error is AdminApiError;

/** 是不是 401（缺 / 错 Admin Token）。 */
export declare function isUnauthorizedError(error: unknown): error is AdminApiError;

/** 解析后端错误信封 `{ error: { code, message } }`；非信封回落截断原文；空正文 → `{}`。 */
export declare function readAdminApiError(response: {
  text(): Promise<string>;
}): Promise<{ code?: string; detail?: string }>;
