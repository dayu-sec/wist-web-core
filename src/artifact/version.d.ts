/**
 * 从制品来源（URL / 路径）的末段粗解析版本号；读不出返回 `""`（调用方据此显示未识别）。
 *
 * 权威解析在中心侧（`wist-center` 的 `infra/package.rs::read_package_identity`）；本函数只做
 * 同一套规则的轻量版，供表单在提交前预览「会记哪个版本」，真值以发布回执为准。
 */
export declare function versionFromArtifactUrl(source: string): string;
