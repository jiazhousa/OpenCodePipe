// ocp hook pre-push——stdin refs 解析 + git diff --name-status + 调 hook-core 校验（D3）。
// fail-open 口径（钉死）：任何解析/git 异常 → stderr WARN + 放行，hook 故障不硬阻断推送。
// stdin 每行 `<local_ref> <local_sha> <remote_ref> <remote_sha>`（多 ref 行逐一处理）；
// remote_sha 全零（新分支）降级 diff `local~1..local` + WARN；local_sha 全零（删除推送）跳过该 ref；
// .stage/.stage-history 读工作区文件（D3 读取口径），工作区脏时 WARN 提示可能不一致。
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { brepoRoot } from "../brepo-root";
import {
  DEFAULT_PREPUSH_CONFIG,
  evaluatePush,
  type DiffFile,
  type PrepushConfig,
} from "./hook-core";

/** stdin 单 ref 行的四段结构 */
export interface PushRef {
  localRef: string;
  localSha: string;
  remoteRef: string;
  remoteSha: string;
}

/** ref 行解析失败（调用方 fail-open 放行） */
export class HookInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HookInputError";
  }
}

/** 全零 sha（新分支 remote / 删除推送 local 的 git 约定形态，兼容 SHA-1/SHA-256 长度） */
const ZERO_SHA = /^0+$/;

function warnOut(text: string): void {
  console.error(`[pre-push] 警告：${text}`);
}

function errMsg(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** stdin 文本 → ref 行数组；空行容忍；畸形行抛 HookInputError */
export function parseRefLines(input: string): PushRef[] {
  const refs: PushRef[] = [];
  for (const raw of input.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const parts = line.split(/\s+/);
    if (parts.length !== 4) {
      throw new HookInputError(`ref 行须为 <local_ref> <local_sha> <remote_ref> <remote_sha> 四段：${line}`);
    }
    const [localRef, localSha, remoteRef, remoteSha] = parts;
    refs.push({ localRef, localSha, remoteRef, remoteSha });
  }
  return refs;
}

/** 剥 git quotePath 对特殊字符路径的首尾引号包裹 */
function stripQuotes(path: string): string {
  return path.replace(/^"|"$/g, "");
}

/**
 * git diff --name-status 输出 → 文件清单。
 * R（rename）展开双路径：旧路径 deleted=true + 新路径 deleted=false；
 * C（copy）双路径均非删除；其余按首列 D 判删除。无法解析的行跳过（fail-open 不因单行阻断）。
 */
export function parseNameStatus(output: string): DiffFile[] {
  const files: DiffFile[] = [];
  for (const raw of output.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (!line.trim()) continue;
    const [status, ...paths] = line.split("\t");
    if (!status || paths.length === 0 || !paths[0]) continue;
    const kind = status[0];
    if (kind === "R") {
      if (paths[0]) files.push({ path: stripQuotes(paths[0]), deleted: true });
      if (paths[1]) files.push({ path: stripQuotes(paths[1]), deleted: false });
    } else if (kind === "C") {
      if (paths[0]) files.push({ path: stripQuotes(paths[0]), deleted: false });
      if (paths[1]) files.push({ path: stripQuotes(paths[1]), deleted: false });
    } else {
      files.push({ path: stripQuotes(paths[0]), deleted: kind === "D" });
    }
  }
  return files;
}

/** 加载 B 仓 configs/prepush-config.json；缺失/损坏 → 内置默认 + WARN（配置是数据，代码兜底形态） */
async function loadConfig(): Promise<{ config: PrepushConfig; warning?: string }> {
  const path = join(brepoRoot(), "configs", "prepush-config.json");
  try {
    const raw = JSON.parse(await readFile(path, "utf8")) as PrepushConfig;
    if (!Array.isArray(raw.codePatterns) || typeof raw.archivePrefix !== "string") {
      throw new Error("字段形态不符（codePatterns 须数组、archivePrefix 须字符串）");
    }
    return { config: raw };
  } catch (error) {
    return { config: DEFAULT_PREPUSH_CONFIG, warning: `prepush 配置加载失败（${errMsg(error)}），使用内置默认` };
  }
}

/**
 * pre-push 校验主流程（stdin 文本注入可测）。
 * 返回退出码：0=放行（含全部 fail-open 路径）；1=校验拒绝。
 */
export async function runHookPrePush(ctx: { cwd: string; stdin: string }): Promise<number> {
  // 影响判定的提示统一收集，末尾输出；各跳过点即时输出后不重复入列
  const warnings: string[] = [];
  try {
    let refs: PushRef[];
    try {
      refs = parseRefLines(ctx.stdin);
    } catch (error) {
      warnOut(`stdin ref 行解析失败（${errMsg(error)}），跳过工作流校验`);
      return 0;
    }
    if (refs.length === 0) {
      return 0; // 无待推 ref（空 stdin），无事可校
    }

    // 工作区脏检测：.stage/.stage-history 读工作区文件，脏工作区可能与待推提交不一致
    const dirty = Bun.spawnSync(["git", "-C", ctx.cwd, "status", "--porcelain"], { stdout: "pipe", stderr: "pipe" });
    if (dirty.exitCode === 0 && dirty.stdout.toString().trim().length > 0) {
      warnings.push("工作区存在未提交变更：校验读取工作区 .stage/.stage-history，可能与待推提交不一致");
    }

    // 各 ref 行收集 diff 文件清单（Map 去重，后写覆盖）
    const fileMap = new Map<string, boolean>();
    for (const ref of refs) {
      if (ZERO_SHA.test(ref.localSha)) {
        warnOut(`${ref.localRef} 为删除推送（local sha 全零），跳过该 ref`);
        continue;
      }
      const isNewBranch = ZERO_SHA.test(ref.remoteSha);
      const range = isNewBranch ? `${ref.localSha}~1..${ref.localSha}` : `${ref.remoteSha}..${ref.localSha}`;
      if (isNewBranch) {
        warnings.push(`${ref.localRef} 为新分支（remote sha 全零），diff 降级为 ${range}（仅末次提交）`);
      }
      const diff = Bun.spawnSync(["git", "-C", ctx.cwd, "diff", "--name-status", range], {
        stdout: "pipe",
        stderr: "pipe",
      });
      if (diff.exitCode !== 0) {
        warnOut(`git diff ${range} 失败（${diff.stderr.toString().trim() || `exit ${diff.exitCode}`}），跳过该范围——常见于根提交无 ~1`);
        continue;
      }
      for (const file of parseNameStatus(diff.stdout.toString())) {
        fileMap.set(file.path, file.deleted);
      }
    }

    // 仓库根（工作区读取锚点）；解析失败 fail-open
    const toplevel = Bun.spawnSync(["git", "-C", ctx.cwd, "rev-parse", "--show-toplevel"], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const repoRoot = toplevel.exitCode === 0 ? toplevel.stdout.toString().trim() : "";
    if (!repoRoot) {
      warnOut(`仓库根解析失败（${toplevel.stderr.toString().trim() || "未知错误"}），跳过工作流校验`);
      return 0;
    }

    const { config, warning } = await loadConfig();
    if (warning) warnings.push(warning);

    const files: DiffFile[] = [...fileMap.entries()].map(([path, deleted]) => ({ path, deleted }));
    const decision = await evaluatePush(files, repoRoot, config);
    warnings.push(...decision.warnings);
    for (const text of warnings) {
      warnOut(text);
    }
    if (decision.decision === "reject") {
      for (const reason of decision.reasons) {
        console.error(`[pre-push] 拒绝：${reason}`);
      }
      return 1;
    }
    return 0;
  } catch (error) {
    warnOut(`校验过程异常（${errMsg(error)}），fail-open 放行`);
    return 0;
  }
}

/** 命令行入口：ocp hook pre-push（由 .git/hooks/pre-push 薄壳调用） */
export async function main(args: string[], ctx: { cwd: string }): Promise<number> {
  // git 调用 pre-push 约定：$1=remote 名、$2=push url——薄壳透传为额外位置参数，属合法形态，忽略之
  if (args[0] !== "pre-push" || args.length > 3) {
    console.error("用法：ocp hook pre-push（由 pre-push 薄壳调用，stdin 传 ref 行，勿手工执行）");
    return 2;
  }
  const stdin = await Bun.stdin.text();
  return runHookPrePush({ cwd: ctx.cwd, stdin });
}
