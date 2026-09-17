// commit message 格式检查核心（D12）——纯逻辑模块，可独立 import 测试；CLI 消费（ocp check commit-format）。
// 规则：首行 `<type>: <描述>`；type ∈ 可配置集合（默认 feat/fix/docs/chore/refactor/test/style）；
// 描述至少一个 CJK 字符；merge commit（Merge / Merge branch / Merge pull request 开头）跳过不检。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** type 内置默认集（与 configs/commit-format.json 一致） */
export const DEFAULT_COMMIT_TYPES: readonly string[] = ["feat", "fix", "docs", "chore", "refactor", "test", "style"];

/** merge commit 判定（D12 钉死）：Merge 开头即跳过（含 Merge branch / Merge pull request 常见形态） */
export const MERGE_PREFIX_RE = /^Merge( branch| pull request)?/;

/** B 仓 configs/ 目录（types 配置所在） */
const defaultConfigsDir = fileURLToPath(new URL("../configs/", import.meta.url));

export interface CommitFormatConfig {
  types: string[];
}

/** 读取 type 集：优先 configs/commit-format.json，缺失/非法时回退内置默认 */
export function loadCommitFormatConfig(configsDir: string = defaultConfigsDir): CommitFormatConfig {
  try {
    const config = JSON.parse(readFileSync(join(configsDir, "commit-format.json"), "utf8")) as { types?: unknown };
    if (Array.isArray(config.types) && config.types.every((t) => typeof t === "string") && config.types.length > 0) {
      return { types: config.types as string[] };
    }
  } catch {
    // 配置缺失或解析失败——回退内置默认
  }
  return { types: [...DEFAULT_COMMIT_TYPES] };
}

export interface SubjectCheckResult {
  /** pass=true 且 skipped=true 表示 merge commit 放行（非违规） */
  pass: boolean;
  skipped: boolean;
  /** 违规原因（pass=false 时必有） */
  reason?: string;
}

/** 单条 commit 首行校验（纯函数核心） */
export function checkCommitSubject(subject: string, types: readonly string[]): SubjectCheckResult {
  const trimmed = subject.trim();
  if (trimmed === "") return { pass: false, skipped: false, reason: "首行为空" };
  if (MERGE_PREFIX_RE.test(trimmed)) return { pass: true, skipped: true };
  // 格式钉死 `<type>: <描述>`：type 为冒号前无空白的词，冒号后恰一个空格接描述
  const match = /^([^:\s]+): (.+)$/.exec(trimmed);
  if (!match) return { pass: false, skipped: false, reason: "缺 `<type>: <描述>` 前缀（冒号后需一个空格）" };
  const [, type, description] = match;
  if (!types.includes(type)) {
    return { pass: false, skipped: false, reason: `type "${type}" 不在允许集 {${[...types].join(", ")}}` };
  }
  if (!/[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(description)) {
    return { pass: false, skipped: false, reason: "描述至少需要一个 CJK 字符" };
  }
  return { pass: true, skipped: false };
}

export interface CommitSubject {
  hash: string;
  subject: string;
}

/** git log 取 commit 首行：gitArgs 原样追加（如 ["-1","HEAD"] 或 ["HEAD~3..HEAD"]）；失败抛错由 CLI 层兜底 */
export function collectCommitSubjects(gitArgs: readonly string[], cwd: string): CommitSubject[] {
  const result = Bun.spawnSync(["git", "log", "--pretty=format:%H%x1f%s", ...gitArgs], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString().trim();
    throw new Error(`git log 失败：${stderr || `退出码 ${result.exitCode}`}`);
  }
  const output = result.stdout.toString().trim();
  if (output === "") return [];
  return output.split("\n").map((line) => {
    const separator = line.indexOf("\x1f");
    return { hash: line.slice(0, separator), subject: line.slice(separator + 1) };
  });
}

export interface CommitFormatProblem {
  hash: string;
  subject: string;
  reason: string;
}

export interface CommitFormatResult {
  pass: boolean;
  problems: CommitFormatProblem[];
  /** 校验条数（merge commit 跳过不计数） */
  checked: number;
}

/** 执行检查：收集 + 逐条校验 */
export function checkCommitFormat(
  gitArgs: readonly string[],
  cwd: string,
  config: CommitFormatConfig = loadCommitFormatConfig(),
): CommitFormatResult {
  const problems: CommitFormatProblem[] = [];
  let checked = 0;
  for (const commit of collectCommitSubjects(gitArgs, cwd)) {
    const verdict = checkCommitSubject(commit.subject, config.types);
    if (verdict.skipped) continue;
    checked += 1;
    if (!verdict.pass) problems.push({ hash: commit.hash, subject: commit.subject, reason: verdict.reason ?? "未知原因" });
  }
  return { pass: problems.length === 0, problems, checked };
}

/** 人读输出（CLI 路由用） */
export function formatCommitFormatResult(result: CommitFormatResult): string {
  const lines = result.problems.map((problem) => `${problem.hash.slice(0, 8)}「${problem.subject}」：${problem.reason}`);
  lines.push(
    result.pass
      ? `commit-format 检查：PASS（${result.checked} 条 commit 格式合规）`
      : `commit-format 检查：FAIL（${result.problems.length} 条违规，共校验 ${result.checked} 条）`,
  );
  return lines.join("\n");
}
