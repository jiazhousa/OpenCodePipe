// check-tools 四项检查正反用例（改动点 24）+ check 路由用法错误。
// 反向用例锚定真实工件形态：144 行 impl 报告不误报（impl 类不配规则）、
// 34 行 Epic 报告走 ≤40 规则不误伤（规则表按序首配生效）、vendored 十件零平台词。
import { describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkCommitSubject, checkCommitFormat } from "../check-tools/commit-format";
import {
  checkLineBudgetDir,
  countLines,
  DEFAULT_LINE_BUDGET_RULES,
  globToRegex,
  matchRule,
} from "../check-tools/line-budget";
import {
  buildWordMatcher,
  checkPlatformWords,
  defaultScanDir,
  scanTextForPlatformWords,
} from "../check-tools/platform-words";
import { checkWhitespace, loadCodePatterns, patternToRegex, scanContent } from "../check-tools/whitespace";
import { main as checkMain } from "../cli/commands/check";

/** B 仓根（测试内做真实工件集成用例） */
const brepoRoot = fileURLToPath(new URL("../", import.meta.url));

/** 造临时目录并在测试后清理 */
function withTempDir<T>(fn: (dir: string) => T): T {
  const dir = mkdtempSync(join(tmpdir(), "ocp-check-tools-"));
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** 生成 n 行文本（以换行结尾，wc -l 口径下恰 n 行） */
const linesOf = (n: number, line = "x"): string => `${Array.from({ length: n }, () => line).join("\n")}\n`;

describe("whitespace（D10）", () => {
  test("scanContent：尾随空格/Tab 报行号，末尾缺换行报 EOF，干净内容零问题", () => {
    const hits = scanContent("const a = 1; \nconst b = 2;\t\n干净行\n最后一行无换行");
    expect(hits).toEqual([
      { line: 1, kind: "trailing-whitespace" },
      { line: 2, kind: "trailing-whitespace" },
      { line: null, kind: "missing-eof-newline" },
    ]);
    expect(scanContent("干净\n多行\n内容\n")).toEqual([]);
    expect(scanContent("")).toEqual([]);
  });

  test("patternToRegex：`src/**` 目录前缀命中、根级精确文件不误命中子目录", () => {
    expect(patternToRegex("src/**").test("src/a.ts")).toBe(true);
    expect(patternToRegex("src/**").test("src/sub/dir/a.ts")).toBe(true);
    expect(patternToRegex("src/**").test("xsrc/a.ts")).toBe(false);
    expect(patternToRegex("package.json").test("package.json")).toBe(true);
    expect(patternToRegex("package.json").test("sub/package.json")).toBe(false);
    expect(patternToRegex("cli/**").test("cli/commands/check.ts")).toBe(true);
  });

  test("loadCodePatterns：单一配置源——读 configs/prepush-config.json（块B 已交付，配置在场）", () => {
    const patterns = loadCodePatterns();
    // 与 D4 默认十项比对（配置与内置默认当前一致；块B 若演进配置，本用例随配置更新）
    for (const expected of ["src/**", "cli/**", "check-tools/**", "configs/**", "package.json", "bun.lock"]) {
      expect(patterns).toContain(expected);
    }
  });

  test("checkWhitespace：只扫白名单命中文件，docs/ 等档案类不在默认范围", () => {
    withTempDir((root) => {
      mkdirSync(join(root, "src"));
      mkdirSync(join(root, "docs"));
      writeFileSync(join(root, "src", "a.ts"), "const a = 1; \n");
      writeFileSync(join(root, "docs", "x.md"), "档案尾随空格 \n");
      writeFileSync(join(root, "package.json"), "{}\n");
      writeFileSync(join(root, "logo.png"), "\0binary");

      // 默认形态白名单：src/package.json 命中，docs/ 与二进制不在范围
      const result = checkWhitespace(root, ["src/**", "package.json"]);
      expect(result.scanned).toBe(2);
      expect(result.pass).toBe(false);
      expect(result.problems).toEqual([{ file: "src/a.ts", line: 1, kind: "trailing-whitespace" }]);

      // docs 显式纳入白名单才被扫（白名单即扫描范围边界）
      const docs = checkWhitespace(root, ["docs/**"]);
      expect(docs.scanned).toBe(1);
      expect(docs.problems).toEqual([{ file: "docs/x.md", line: 1, kind: "trailing-whitespace" }]);
    });
  });
});

describe("line-budget（D11：规则表按序首配生效）", () => {
  test("countLines：wc -l 口径（尾换行不计多余行；末行无换行仍计 1）", () => {
    expect(countLines("")).toBe(0);
    expect(countLines("a\n")).toBe(1);
    expect(countLines("a\nb")).toBe(2);
    expect(countLines("a")).toBe(1);
    expect(countLines(linesOf(144))).toBe(144);
  });

  test("globToRegex：`*` 单段通配锚定全路径（{wf} 先替换为工作流根字面）", () => {
    const specRe = globToRegex("{wf}/plans/*/spec.md".replaceAll("{wf}", ".specpipe"));
    expect(specRe.test(".specpipe/plans/topic-a/spec.md")).toBe(true);
    expect(specRe.test(".specpipe/plans/topic-a/sub/spec.md")).toBe(false);
    expect(specRe.test(".specpipe/plans/spec.md")).toBe(false);
    const reviewRe = globToRegex("{wf}/reviews/*-spec-revision-*.md".replaceAll("{wf}", ".specpipe"));
    expect(reviewRe.test(".specpipe/reviews/t-epic-spec-revision-1.md")).toBe(true);
  });

  test("matchRule：Epic 报告首配 ≤40 规则（排序防误伤核心断言）", () => {
    const epic = matchRule(".specpipe/reviews/specpipe-v2-split-epic-spec-revision-1.md", DEFAULT_LINE_BUDGET_RULES);
    expect(epic?.maxLines).toBe(40);
    const spec = matchRule(".specpipe/reviews/specpipe-v2-s2-core-spec-revision-1.md", DEFAULT_LINE_BUDGET_RULES);
    expect(spec?.maxLines).toBe(30);
    // impl 类报告不配规则（06 卷不设上限）
    expect(matchRule(".specpipe/reviews/specpipe-v2-s1-rules-impl-revision-1.md", DEFAULT_LINE_BUDGET_RULES)).toBeNull();
    expect(matchRule(".specpipe/plans/topic/impl.md", DEFAULT_LINE_BUDGET_RULES)).toBeNull();
    expect(matchRule(".specpipe/reviews/t-quality-gate-revision-1.md", DEFAULT_LINE_BUDGET_RULES)).toBeNull();
  });

  test("反向用例：144 行 impl 报告不误报、34 行 Epic 报告走 ≤40 不误伤", () => {
    withTempDir((wfDir) => {
      mkdirSync(join(wfDir, "reviews"));
      writeFileSync(join(wfDir, "reviews", "t-impl-revision-1.md"), linesOf(144)); // 144 行合法 impl 报告
      writeFileSync(join(wfDir, "reviews", "t-epic-spec-revision-1.md"), linesOf(34)); // 34 行合法 Epic 报告
      const result = checkLineBudgetDir(wfDir, ".specpipe", DEFAULT_LINE_BUDGET_RULES);
      expect(result.checked).toBe(1); // 只有 Epic 报告命中规则
      expect(result.pass).toBe(true);
    });
  });

  test("正向用例：各规则超限即 FAIL，边界值放行", () => {
    withTempDir((wfDir) => {
      mkdirSync(join(wfDir, "reviews"));
      mkdirSync(join(wfDir, "plans", "topic-a"), { recursive: true });
      writeFileSync(join(wfDir, "reviews", "t-spec-revision-1.md"), linesOf(31)); // 31 > 30
      writeFileSync(join(wfDir, "reviews", "t-epic-spec-revision-1.md"), linesOf(41)); // 41 > 40
      writeFileSync(join(wfDir, "plans", "topic-a", "spec.md"), linesOf(301)); // 301 > 300
      const result = checkLineBudgetDir(wfDir, ".specpipe", DEFAULT_LINE_BUDGET_RULES);
      expect(result.pass).toBe(false);
      expect(result.problems.map((p) => p.maxLines).sort((a, b) => a - b)).toEqual([30, 40, 300]);
    });
    withTempDir((wfDir) => {
      mkdirSync(join(wfDir, "reviews"));
      writeFileSync(join(wfDir, "reviews", "t-spec-revision-1.md"), linesOf(30)); // 边界 30 ≤ 30
      writeFileSync(join(wfDir, "reviews", "t-epic-spec-revision-1.md"), linesOf(40)); // 边界 40 ≤ 40
      expect(checkLineBudgetDir(wfDir, ".specpipe", DEFAULT_LINE_BUDGET_RULES).pass).toBe(true);
    });
  });

  test("集成：B 仓真实工作流档案全量扫描零误报（144/130/165 行 impl 报告 + 34 行 Epic 报告在场）", () => {
    const result = checkLineBudgetDir(join(brepoRoot, ".specpipe"), ".specpipe", DEFAULT_LINE_BUDGET_RULES);
    expect(result.pass).toBe(true);
  });
});

describe("commit-format（D12）", () => {
  const types = ["feat", "fix", "docs", "chore", "refactor", "test", "style"];

  test("合法：type 前缀 + CJK 描述", () => {
    expect(checkCommitSubject("feat: 新增导出功能", types)).toEqual({ pass: true, skipped: false });
    expect(checkCommitSubject("docs: Story 3 spec 终稿——五项裁决并入", types)).toEqual({ pass: true, skipped: false });
  });

  test("非法：无前缀 / type 不在集 / 无 CJK / 冒号后无空格 / 首行为空", () => {
    expect(checkCommitSubject("新增导出功能", types).pass).toBe(false);
    expect(checkCommitSubject("build: 构建脚本", types).pass).toBe(false);
    expect(checkCommitSubject("feat: add export feature", types).pass).toBe(false);
    expect(checkCommitSubject("feat:中文描述无空格", types).pass).toBe(false);
    expect(checkCommitSubject("   ", types).pass).toBe(false);
  });

  test("merge commit 跳过：Merge / Merge branch / Merge pull request / Merge remote-tracking 开头", () => {
    expect(checkCommitSubject("Merge branch 'dev/feat/x' into develop", types)).toEqual({ pass: true, skipped: true });
    expect(checkCommitSubject("Merge pull request #1 from fork/branch", types)).toEqual({ pass: true, skipped: true });
    expect(checkCommitSubject("Merge remote-tracking branch 'origin/main'", types)).toEqual({ pass: true, skipped: true });
  });

  test("集成：B 仓真实 git 历史（HEAD 单条与近三条）格式合规", () => {
    expect(checkCommitFormat(["-1", "HEAD"], brepoRoot).pass).toBe(true);
    expect(checkCommitFormat(["HEAD~3..HEAD"], brepoRoot).checked).toBeGreaterThan(0);
  });
});

describe("platform-words（D14）", () => {
  test("词形边界：独立词命中，长词内嵌不误命中", () => {
    const m = (w: string) => buildWordMatcher(w).re;
    expect(m("opencode").test("通过 opencode 平台")).toBe(true);
    expect(m("opencode").test("opencodepipe 仓库")).toBe(false);
    expect(m("npm").test("用 npm 安装")).toBe(true);
    expect(m("npm").test("npmscript")).toBe(false);
    expect(m("Oracle").test("由 Oracle 调度")).toBe(true);
    expect(m("Oracle").test("oracles 数据库")).toBe(false); // 大小写敏感 + 词形边界
    expect(m("agents/").test("路径 agents/oracle.md")).toBe(true);
    expect(m("agents/").test("subagents/oracle.md")).toBe(false);
    expect(m(".opencode").test("项目级 .opencode 目录")).toBe(true);
    expect(m("task 工具").test("通过 task 工具调用")).toBe(true);
  });

  test("scanText：多词命中报词与行号（词表顺序）", () => {
    const matchers = ["opencode", "npm", "Oracle"].map(buildWordMatcher);
    const hits = scanTextForPlatformWords("第一行干净\n用 npm 与 opencode\n调度者 Oracle\n", matchers);
    expect(hits).toEqual([
      { word: "opencode", line: 2 },
      { word: "npm", line: 2 },
      { word: "Oracle", line: 3 },
    ]);
  });

  test("checkPlatformWords：命中与干净目录 + extraWords 扩展生效", () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, "a.md"), "规范文本提到 npm 与 Oracle\n");
      writeFileSync(join(dir, "b.md"), "平台无关的干净文本\n");
      const result = checkPlatformWords(dir, { words: ["npm", "Oracle"], extraWords: [] });
      expect(result.scanned).toBe(2);
      expect(result.problems).toEqual([
        { file: "a.md", word: "npm", line: 1 },
        { file: "a.md", word: "Oracle", line: 1 },
      ]);
      // extraWords 并入生效集（b.md 命中扩展词）
      const extended = checkPlatformWords(dir, { words: [], extraWords: ["平台无关"] });
      expect(extended.problems).toEqual([{ file: "b.md", word: "平台无关", line: 1 }]);
    });
  });

  test("集成：默认扫描 vendored 十件零命中（S1 平台无关验收的回归锚点）", () => {
    const result = checkPlatformWords(defaultScanDir);
    expect(result.scanned).toBe(10);
    expect(result.pass).toBe(true);
  });
});

describe("check 路由（D9）", () => {
  test("用法错误：无检查项 / 未知检查项 / 未知选项 → 2；--help → 0", async () => {
    expect(await checkMain([], { cwd: brepoRoot })).toBe(2);
    expect(await checkMain(["nope"], { cwd: brepoRoot })).toBe(2);
    expect(await checkMain(["whitespace", "--evil", "1"], { cwd: brepoRoot })).toBe(2);
    expect(await checkMain(["--help"], { cwd: brepoRoot })).toBe(0);
  });

  test("whitespace 子命令：干净目录 0、脏目录 1", async () => {
    expect(await checkMain(["whitespace"], { cwd: brepoRoot })).toBe(0);
    const code = await withTempDir(async (dir) => {
      mkdirSync(join(dir, "src"));
      writeFileSync(join(dir, "src", "a.ts"), "尾随空格 \n");
      return checkMain(["whitespace"], { cwd: dir });
    });
    expect(code).toBe(1);
  });
});
