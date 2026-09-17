// 尾随空白检查核心（D10）——纯逻辑模块，可独立 import 测试；CLI 消费（ocp check whitespace）。
// 扫描范围：codePatterns 白名单（单一配置源，沿用 configs/prepush-config.json；块B 交付前以
// 内置默认值兜底，两者与 D4 默认完全一致）命中的文本文件：
//   ① 尾随空白（行末空格/Tab）——报 文件:行号
//   ② 文件末尾缺换行——报 文件:EOF
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** codePatterns 内置默认（与 D4 configs/prepush-config.json 默认一致；白名单命中即代码范围） */
export const DEFAULT_CODE_PATTERNS: readonly string[] = [
  "src/**",
  "tests/**",
  "scripts/**",
  "cli/**",
  "check-tools/**",
  "agents/**",
  "configs/**",
  "package.json",
  "tsconfig.json",
  "bun.lock",
];

/** B 仓 configs/ 目录（prepush-config.json 单一配置源所在） */
const defaultConfigsDir = fileURLToPath(new URL("../configs/", import.meta.url));

/**
 * 白名单模式 → 正则（gitignore 风格子集）：`**` 跨目录段（`src/**` 即 src/ 下任意深度）；
 * `*` 单目录段内通配；无通配符为仓库根级精确文件。路径一律 posix 相对仓库根。
 */
export function patternToRegex(pattern: string): RegExp {
  // 注意：转义集不含 `*`（保留给通配替换，先转义会把 `*` 变 `\*` 产生损坏的 `\[^/]*`）
  const segs = pattern.split("**");
  const body = segs
    .map((seg) => seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join(".*");
  return new RegExp(`^${body}$`);
}

/** 读取 codePatterns：优先 configs/prepush-config.json（单一配置源），缺失/非法时回退内置默认 */
export function loadCodePatterns(configsDir: string = defaultConfigsDir): string[] {
  try {
    const config = JSON.parse(readFileSync(join(configsDir, "prepush-config.json"), "utf8")) as {
      codePatterns?: unknown;
    };
    if (Array.isArray(config.codePatterns) && config.codePatterns.every((p) => typeof p === "string")) {
      return config.codePatterns as string[];
    }
  } catch {
    // 配置未交付（块B）或解析失败——回退内置默认
  }
  return [...DEFAULT_CODE_PATTERNS];
}

export interface WhitespaceProblem {
  /** 相对仓库根的 posix 路径 */
  file: string;
  /** 行号（1 起算）；EOF 缺换行为 null */
  line: number | null;
  kind: "trailing-whitespace" | "missing-eof-newline";
}

/** 单文件内容扫描（纯函数核心） */
export function scanContent(content: string): { line: number | null; kind: WhitespaceProblem["kind"] }[] {
  const hits: { line: number | null; kind: WhitespaceProblem["kind"] }[] = [];
  if (content.includes("\0")) return hits; // 二进制文件跳过
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    if (/[ \t]+$/.test(lines[i])) hits.push({ line: i + 1, kind: "trailing-whitespace" });
  }
  if (content !== "" && !content.endsWith("\n")) hits.push({ line: null, kind: "missing-eof-newline" });
  return hits;
}

/** 遍历时跳过的目录（.git/node_modules 必跳；test-fence-reports 为 fence 产物目录，与 tsconfig exclude 一致） */
const SKIPPED_DIRS = new Set([".git", "node_modules", "test-fence-reports"]);

/** 递归收集目录下全部文件（相对路径 posix 化） */
function collectFiles(root: string, dir = root, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) collectFiles(root, join(dir, entry.name), acc);
    } else {
      acc.push(relative(root, join(dir, entry.name)).split(/[\\/]/).join("/"));
    }
  }
  return acc;
}

export interface WhitespaceResult {
  pass: boolean;
  problems: WhitespaceProblem[];
  /** 实际扫描的文件数（白名单命中的文本文件） */
  scanned: number;
}

/** 执行检查：repoRoot 为仓库根；patterns 缺省读单一配置源 */
export function checkWhitespace(repoRoot: string, patterns?: string[]): WhitespaceResult {
  const activePatterns = patterns ?? loadCodePatterns();
  const regexes = activePatterns.map((pattern) => ({ pattern, re: patternToRegex(pattern) }));
  const problems: WhitespaceProblem[] = [];
  let scanned = 0;
  for (const rel of collectFiles(resolve(repoRoot))) {
    if (!regexes.some(({ re }) => re.test(rel))) continue;
    let content: string;
    try {
      content = readFileSync(join(repoRoot, rel), "utf8");
    } catch {
      continue; // 不可读文件（权限等）跳过，不误报
    }
    scanned += 1;
    for (const hit of scanContent(content)) {
      problems.push({ file: rel, line: hit.line, kind: hit.kind });
    }
  }
  return { pass: problems.length === 0, problems, scanned };
}

/** 人读输出（CLI 路由用） */
export function formatWhitespaceResult(result: WhitespaceResult): string {
  const lines = result.problems.map((problem) =>
    problem.line === null ? `${problem.file}:EOF:文件末尾缺换行` : `${problem.file}:${problem.line}:尾随空白`,
  );
  lines.push(
    result.pass
      ? `whitespace 检查：PASS（扫描 ${result.scanned} 个文件）`
      : `whitespace 检查：FAIL（${result.problems.length} 处问题，扫描 ${result.scanned} 个文件）`,
  );
  return lines.join("\n");
}
