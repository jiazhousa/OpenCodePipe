// 工件行数预算检查核心（D11）——纯逻辑模块，可独立 import 测试；CLI 消费（ocp check line-budget）。
// 规则表（configs/line-budget.json，06 卷逐类口径，不设兜底上限）：
//   spec.md ≤300 / epic-spec.md ≤500 / issue-impl.md ≤80 /
//   Epic Spec 报告 ≤40 / Spec 报告 ≤30；
//   impl.md 与 impl/issue-impl/质量门报告不配规则（06 卷明确不设上限——现存 144/130 行合法 impl 报告不可误报）。
// 规则表按序匹配、首个命中生效——*-epic-spec-revision-* 必须排在 *-spec-revision-* 之前
// （后者通配同样覆盖 Epic 报告文件名，若先命中会把 40 上限误压为 30）。
// 取终稿口径：glob 只匹配终稿文件名（spec.md / epic-spec.md），草案与过程稿不检。
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface LineBudgetRule {
  /** 工件路径模式：`{wf}` 运行时替换为工作流根；`*` 单目录段通配 */
  pattern: string;
  maxLines: number;
}

/** 内置默认规则（与 configs/line-budget.json 一致；顺序即优先级，不可调换 epic/spec 两行） */
export const DEFAULT_LINE_BUDGET_RULES: readonly LineBudgetRule[] = [
  { pattern: "{wf}/plans/*/spec.md", maxLines: 300 },
  { pattern: "{wf}/plans/*/epic-spec.md", maxLines: 500 },
  { pattern: "{wf}/plans/*/issue-impl.md", maxLines: 80 },
  { pattern: "{wf}/reviews/*-epic-spec-revision-*.md", maxLines: 40 },
  { pattern: "{wf}/reviews/*-spec-revision-*.md", maxLines: 30 },
];

/** B 仓 configs/ 目录（规则数据文件所在） */
const defaultConfigsDir = fileURLToPath(new URL("../configs/", import.meta.url));

/** 模式 → 正则：`**` 跨目录段、`*` 单目录段、其余按字面；路径 posix 相对仓库根，严格锚定 */
export function globToRegex(pattern: string): RegExp {
  // 注意：转义集不含 `*`（保留给通配替换，先转义会把 `*` 变 `\*` 产生损坏的 `\[^/]*`）
  const body = pattern
    .split("**")
    .map((seg) => seg.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]*"))
    .join(".*");
  return new RegExp(`^${body}$`);
}

/** 行数口径与 wc -l 一致：换行符计数（末行无换行仍计 1 行；空文件 0 行） */
export function countLines(content: string): number {
  if (content === "") return 0;
  return content.split("\n").length - (content.endsWith("\n") ? 1 : 0);
}

/** 按序匹配、首个命中生效（未命中返回 null = 不检查）；pattern 中 `{wf}` 先替换为 wfPrefix */
export function matchRule(
  pathWithWf: string,
  rules: readonly LineBudgetRule[],
  wfPrefix = ".specpipe",
): LineBudgetRule | null {
  for (const rule of rules) {
    if (globToRegex(rule.pattern.replaceAll("{wf}", wfPrefix)).test(pathWithWf)) return rule;
  }
  return null;
}

/** 读取规则表：优先 configs/line-budget.json，缺失/非法时回退内置默认 */
export function loadLineBudgetRules(configsDir: string = defaultConfigsDir): LineBudgetRule[] {
  try {
    const config = JSON.parse(readFileSync(join(configsDir, "line-budget.json"), "utf8")) as {
      rules?: unknown;
    };
    if (
      Array.isArray(config.rules) &&
      config.rules.every(
        (r) =>
          typeof r === "object" && r !== null && typeof (r as LineBudgetRule).pattern === "string" && typeof (r as LineBudgetRule).maxLines === "number",
      )
    ) {
      return config.rules as LineBudgetRule[];
    }
  } catch {
    // 配置缺失或解析失败——回退内置默认
  }
  return [...DEFAULT_LINE_BUDGET_RULES];
}

/** 递归收集目录下全部文件（posix 相对路径） */
function collectFiles(root: string, dir = root, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== ".git") collectFiles(root, join(dir, entry.name), acc);
    } else {
      acc.push(relative(root, join(dir, entry.name)).split(/[\\/]/).join("/"));
    }
  }
  return acc;
}

export interface LineBudgetProblem {
  /** 相对仓库根的 posix 路径（{wf} 前缀形态） */
  file: string;
  lines: number;
  maxLines: number;
  pattern: string;
}

export interface LineBudgetResult {
  pass: boolean;
  problems: LineBudgetProblem[];
  /** 命中规则参与检查的文件数 */
  checked: number;
}

/**
 * 执行检查。wfDir 为工作流根实际目录（扫描对象）；wfPrefix 为参与模式匹配的 {wf} 替换值
 * （通常为相对仓库根的工作流根，如 ".specpipe"）——两者分离以支持测试注入临时目录。
 */
export function checkLineBudgetDir(
  wfDir: string,
  wfPrefix: string,
  rules: readonly LineBudgetRule[] = loadLineBudgetRules(),
): LineBudgetResult {
  const problems: LineBudgetProblem[] = [];
  let checked = 0;
  const root = resolve(wfDir);
  for (const rel of collectFiles(root)) {
    const rule = matchRule(`${wfPrefix}/${rel}`, rules, wfPrefix);
    if (!rule) continue; // 未配规则 = 不检查（impl.md / 各类不设上限报告天然跳过）
    checked += 1;
    const lines = countLines(readFileSync(join(root, rel), "utf8"));
    if (lines > rule.maxLines) {
      problems.push({ file: `${wfPrefix}/${rel}`, lines, maxLines: rule.maxLines, pattern: rule.pattern });
    }
  }
  return { pass: problems.length === 0, problems, checked };
}

/** 人读输出（CLI 路由用） */
export function formatLineBudgetResult(result: LineBudgetResult): string {
  const lines = result.problems.map(
    (problem) => `${problem.file}：${problem.lines} 行，超过上限 ${problem.maxLines}（规则 ${problem.pattern}）`,
  );
  lines.push(
    result.pass
      ? `line-budget 检查：PASS（${result.checked} 个工件在预算内）`
      : `line-budget 检查：FAIL（${result.problems.length} 个工件超限）`,
  );
  return lines.join("\n");
}
