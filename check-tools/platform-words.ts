// 平台词扫描核心（D14）——纯逻辑模块，可独立 import 测试；CLI 消费（ocp check platform-words）。
// 词表（configs/platform-words.json）：words 内置集 = S1 impl 禁词表全量分类（平台标识/平台机制/
// 工具链/角色英文标识）；extraWords 项目级扩展位。词形边界匹配、大小写敏感——词首/词尾为字母数字时
// 两侧不得紧贴 [A-Za-z0-9_]（防 opencodepipe 误命中 opencode、subagents/ 误命中 agents/）。
// 扫描范围：默认 B 仓 configs/vendor/specpipe/（vendored 07 + templates 九件）；
// 全仓检查以 --path 指向 A 仓执行（Epic 验收 6 口径，README 注明）。
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface PlatformWordsConfig {
  words: string[];
  extraWords: string[];
}

/** 内置词表（与 configs/platform-words.json words 一致——D14 十三类 + S1 残项补齐；小写裸词 skill 不入集，依据见 configs note） */
export const DEFAULT_PLATFORM_WORDS: readonly string[] = [
  // 平台标识
  "opencode",
  ".opencode",
  "~/.config/opencode",
  "~/.config",
  // 平台机制
  "subagent",
  "subagent_type",
  "SKILL.md",
  "SKILL",
  "agents/",
  "save_memory",
  "MEMORY.md",
  "permission.external_directory",
  "external_directory",
  "permission",
  "task 工具",
  "json 覆盖",
  // 工具链
  "npm",
  "mvn",
  "pip",
  "tmux",
  "tvly",
  "exa",
  "c7",
  // 角色英文标识（A 仓角色卷为中文术语，英文残留即平台词）
  "Oracle",
  "Explorer",
  "Checker",
  "Builder",
  "Looker",
];

/** B 仓 configs/ 目录（词表数据文件所在） */
const defaultConfigsDir = fileURLToPath(new URL("../configs/", import.meta.url));

/** 词表默认扫描目录：vendored 07 + templates 九件（Epic 验收 6 的全仓口径走 --path 指向 A 仓） */
export const defaultScanDir = fileURLToPath(new URL("../configs/vendor/specpipe/", import.meta.url));

/** 读取词表：优先 configs/platform-words.json，缺失/非法时回退内置集（extraWords 恒并入生效集） */
export function loadPlatformWordsConfig(configsDir: string = defaultConfigsDir): PlatformWordsConfig {
  try {
    const config = JSON.parse(readFileSync(join(configsDir, "platform-words.json"), "utf8")) as {
      words?: unknown;
      extraWords?: unknown;
    };
    const words = Array.isArray(config.words) && config.words.every((w) => typeof w === "string") ? (config.words as string[]) : [...DEFAULT_PLATFORM_WORDS];
    const extraWords =
      Array.isArray(config.extraWords) && config.extraWords.every((w) => typeof w === "string") ? (config.extraWords as string[]) : [];
    return { words, extraWords };
  } catch {
    // 配置缺失或解析失败——回退内置集
    return { words: [...DEFAULT_PLATFORM_WORDS], extraWords: [] };
  }
}

export interface WordMatcher {
  word: string;
  re: RegExp;
}

/** 词 → 带词形边界的正则：仅词首/词尾为字母数字时施加对应边界断言（符号侧不加，如 agents/ 的尾部） */
export function buildWordMatcher(word: string): WordMatcher {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const prefix = /^[A-Za-z0-9]/.test(word) ? "(?<![A-Za-z0-9_])" : "";
  const suffix = /[A-Za-z0-9]$/.test(word) ? "(?![A-Za-z0-9_])" : "";
  return { word, re: new RegExp(`${prefix}${escaped}${suffix}`) };
}

export interface PlatformWordHit {
  word: string;
  line: number;
}

/** 单文本扫描（纯函数核心）：逐词逐行，报告全部命中（同词多处命中逐行列出） */
export function scanTextForPlatformWords(content: string, matchers: readonly WordMatcher[]): PlatformWordHit[] {
  const hits: PlatformWordHit[] = [];
  if (content.includes("\0")) return hits; // 二进制文件跳过
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    for (const matcher of matchers) {
      if (matcher.re.test(lines[i])) hits.push({ word: matcher.word, line: i + 1 });
    }
  }
  return hits;
}

/** 递归收集目录下全部 .md 文件（A 仓/vendored 均为 Markdown 文档仓） */
function collectMarkdownFiles(root: string, dir = root, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== ".git") collectMarkdownFiles(root, join(dir, entry.name), acc);
    } else if (entry.name.endsWith(".md")) {
      acc.push(relative(root, join(dir, entry.name)).split(/[\\/]/).join("/"));
    }
  }
  return acc;
}

export interface PlatformWordsProblem {
  /** 相对 scanDir 的 posix 路径 */
  file: string;
  word: string;
  line: number;
}

export interface PlatformWordsResult {
  pass: boolean;
  problems: PlatformWordsProblem[];
  scanned: number;
}

/** 执行检查：scanDir 递归扫 .md；生效词表 = config.words + config.extraWords */
export function checkPlatformWords(
  scanDir: string,
  config: PlatformWordsConfig = loadPlatformWordsConfig(),
): PlatformWordsResult {
  const matchers = [...config.words, ...config.extraWords].map(buildWordMatcher);
  const problems: PlatformWordsProblem[] = [];
  let scanned = 0;
  const root = resolve(scanDir);
  for (const rel of collectMarkdownFiles(root)) {
    scanned += 1;
    for (const hit of scanTextForPlatformWords(readFileSync(join(root, rel), "utf8"), matchers)) {
      problems.push({ file: rel, word: hit.word, line: hit.line });
    }
  }
  return { pass: problems.length === 0, problems, scanned };
}

/** 人读输出（CLI 路由用） */
export function formatPlatformWordsResult(result: PlatformWordsResult): string {
  const lines = result.problems.map((problem) => `${problem.file}:${problem.line}:平台词「${problem.word}」`);
  lines.push(
    result.pass
      ? `platform-words 检查：PASS（扫描 ${result.scanned} 个 Markdown 文件，零命中）`
      : `platform-words 检查：FAIL（${result.problems.length} 处命中，扫描 ${result.scanned} 个 Markdown 文件）`,
  );
  return lines.join("\n");
}
