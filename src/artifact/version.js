/**
 * 从制品来源（URL / 路径）的末段**粗解析**版本号（供表单预览与离线示例）。
 *
 * ⚠️ **权威解析在中心侧**（`wist-center` 的 `infra/package.rs::read_package_identity`）：
 * 先看包内目录名、读不出再回落来源文件名。这里只做同一套规则的轻量版，
 * 让操作者在提交前能看见会记哪个版本；真值以发布回执为准。
 */

/** 目标三元组的已知架构名（与中心/网关侧同表）；用于从制品名里截掉架构后缀。 */
const KNOWN_ARCHES = [
  "aarch64",
  "x86_64",
  "i686",
  "i586",
  "armv7",
  "armv6",
  "arm",
  "riscv64",
  "powerpc64",
  "powerpc64le",
  "s390x",
  "x86_64h",
  "loongarch64",
];

/**
 * 从制品来源（URL / 路径）的末段粗解析版本号；读不出返回 `""`（调用方据此显示未识别）。
 *
 * 规则与中心侧同表：先去掉查询串与压缩/裸二进制后缀 → 截掉 `<arch>` 及其后 →
 * 在剩下的段里取第一个形如 `v?X.Y[.Z][-suffix]` 的版本。
 */
export function versionFromArtifactUrl(source) {
  const basename = (source.split(/[?#]/)[0].split("/").pop() ?? "").replace(
    /\.(tar\.gz|tar\.bz2|tar\.xz|tgz|tar|gz|zip|bin)$/i,
    "",
  );
  // 先截掉架构后缀（`<name>-<version>-<arch>-<os>-<abi>` 里的 `<arch>` 及其后）。
  const segments = basename.split("-");
  const archAt = segments.findIndex(
    (segment, index) => index > 0 && KNOWN_ARCHES.includes(segment),
  );
  const head = archAt >= 0 ? segments.slice(0, archAt).join("-") : basename;
  const match = head.match(/v?\d+\.\d+(?:\.\d+)?(?:-[0-9A-Za-z.]+)*/);
  return match ? match[0] : "";
}
