// ocp check——机械检查项路由（D9）：五子命令薄路由，核心逻辑在 check-tools/ 纯逻辑模块。
// 子命令：whitespace / line-budget / commit-format / transition-consistency / platform-words。
// 退出码约定：0=通过；1=检查失败；2=用法错误。
import { join } from "node:path";
import {
  checkCommitFormat,
  formatCommitFormatResult,
  loadCommitFormatConfig,
} from "../../check-tools/commit-format";
import { checkLineBudgetDir, formatLineBudgetResult, loadLineBudgetRules } from "../../check-tools/line-budget";
import { checkPlatformWords, defaultScanDir, formatPlatformWordsResult, loadPlatformWordsConfig } from "../../check-tools/platform-words";
import { checkTransitionConsistency, formatConsistencyResult } from "../../check-tools/transition-consistency";
import { checkWhitespace, formatWhitespaceResult, loadCodePatterns } from "../../check-tools/whitespace";

const USAGE = [
  "用法：ocp check <name> [options]",
  "",
  "可检查项：",
  "  whitespace              尾随空白 + 文件末尾缺换行（codePatterns 白名单范围）",
  "  line-budget             工件行数预算（{wf} 规则表按序首配生效；impl 与质量门报告不设上限）",
  "  commit-format           commit 首行 <type>: <中文描述>（--range HEAD~3..HEAD，默认 HEAD 单条；merge 跳过）",
  "  transition-consistency  转移表三层一致性（vendored 哈希 / schema / 快照对账）",
  "  platform-words          平台词扫描（默认 vendored 十件；--path <目录> 全仓口径，如指向 A 仓）",
  "",
  "通用选项：--wf <工作流根>（line-budget 用，默认 .specpipe）",
  "退出码：0=通过；1=检查失败；2=用法错误",
].join("\n");

export async function main(args: string[], ctx: { cwd: string }): Promise<number> {
  const [name, ...rest] = args;
  if (!name) {
    console.error(USAGE);
    return 2;
  }
  if (name === "--help" || name === "-h") {
    console.log(USAGE);
    return 0;
  }

  /** 解析本子命令选项（均为带值选项）；返回 null 表示用法错误（已输出提示） */
  const parseOptions = (allowed: string[]): Map<string, string> | null => {
    const options = new Map<string, string>();
    for (let i = 0; i < rest.length; i += 1) {
      const arg = rest[i];
      if (!arg.startsWith("--") || !allowed.includes(arg)) {
        console.error(`未知选项：${arg}（${name} 支持：${allowed.length > 0 ? allowed.map((o) => `${o} <值>`).join(" ") : "无"}）`);
        return null;
      }
      const value = rest[i + 1];
      if (value === undefined) {
        console.error(`选项 ${arg} 需要一个值`);
        return null;
      }
      options.set(arg, value);
      i += 1;
    }
    return options;
  };

  switch (name) {
    case "whitespace": {
      if (!parseOptions([])) return 2;
      const result = checkWhitespace(ctx.cwd, loadCodePatterns());
      console.log(formatWhitespaceResult(result));
      return result.pass ? 0 : 1;
    }
    case "line-budget": {
      const options = parseOptions(["--wf"]);
      if (options === null) return 2;
      const wfRoot = options.get("--wf") ?? ".specpipe";
      const result = checkLineBudgetDir(join(ctx.cwd, wfRoot), wfRoot, loadLineBudgetRules());
      console.log(formatLineBudgetResult(result));
      return result.pass ? 0 : 1;
    }
    case "commit-format": {
      const options = parseOptions(["--range"]);
      if (options === null) return 2;
      const gitArgs = options.has("--range") ? [options.get("--range") as string] : ["-1", "HEAD"];
      let result;
      try {
        result = checkCommitFormat(gitArgs, ctx.cwd, loadCommitFormatConfig());
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        return 2;
      }
      console.log(formatCommitFormatResult(result));
      return result.pass ? 0 : 1;
    }
    case "transition-consistency": {
      const result = checkTransitionConsistency();
      console.log(formatConsistencyResult(result));
      return result.pass ? 0 : 1;
    }
    case "platform-words": {
      const options = parseOptions(["--path"]);
      if (options === null) return 2;
      const scanDir = options.get("--path");
      const result = checkPlatformWords(scanDir ?? defaultScanDir, loadPlatformWordsConfig());
      console.log(scanDir ? `扫描目录：${scanDir}（全仓口径）` : "扫描目录：vendored（默认，07 + templates 九件）");
      console.log(formatPlatformWordsResult(result));
      return result.pass ? 0 : 1;
    }
    default:
      console.error(`未知检查项：${name}`);
      console.error(USAGE);
      return 2;
  }
}
