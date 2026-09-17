// ocp worktree——worktree 创建封装（D17）：三级分支名校验（目标/性质/名称）+ 专用目录 + 基准分支解析 + 五步指引。
// 指引输出对齐 A 仓 10-composition「工作流（5 步）」：开发 → 整理 commit → push+MR → rel cherry-pick → ms cherry-pick。
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { brepoRoot } from "../brepo-root";

export interface WorktreeConfig {
  /** 目标分支集（第一段），默认对齐 10 卷三分支体系 ["dev","rel","ms"] */
  targets: string[];
  /** 性质集（第二段），默认 ["feat","fix","chore"] */
  kinds: string[];
  /** worktree 专用目录（相对仓库根），默认 "../.ocp-worktrees" */
  worktreeDir: string;
  /** target → 基准分支名映射；未映射的 target 用当前 HEAD */
  baseMap: Record<string, string>;
}

const DEFAULT_CONFIG: WorktreeConfig = {
  targets: ["dev", "rel", "ms"],
  kinds: ["feat", "fix", "chore"],
  worktreeDir: "../.ocp-worktrees",
  baseMap: {},
};

/** 读 configs/worktree-config.json；文件缺失/字段非法时回退默认值并给出 warning */
export async function loadWorktreeConfig(configPath: string): Promise<{ config: WorktreeConfig; warning?: string }> {
  if (!existsSync(configPath)) {
    return { config: { ...DEFAULT_CONFIG } };
  }
  try {
    const parsed: unknown = JSON.parse(await readFile(configPath, "utf8"));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("顶层不是对象");
    }
    const raw = parsed as Record<string, unknown>;
    const targets = Array.isArray(raw.targets) && raw.targets.every((t) => typeof t === "string" && t.length > 0) ? (raw.targets as string[]) : DEFAULT_CONFIG.targets;
    const kinds = Array.isArray(raw.kinds) && raw.kinds.every((k) => typeof k === "string" && k.length > 0) ? (raw.kinds as string[]) : DEFAULT_CONFIG.kinds;
    const worktreeDir = typeof raw.worktreeDir === "string" && raw.worktreeDir !== "" ? raw.worktreeDir : DEFAULT_CONFIG.worktreeDir;
    const baseMap =
      raw.baseMap !== null && typeof raw.baseMap === "object" && !Array.isArray(raw.baseMap) && Object.values(raw.baseMap).every((v) => typeof v === "string")
        ? (raw.baseMap as Record<string, string>)
        : DEFAULT_CONFIG.baseMap;
    return { config: { targets, kinds, worktreeDir, baseMap } };
  } catch (error) {
    return {
      config: { ...DEFAULT_CONFIG },
      warning: `worktree-config.json 解析失败，已回退默认值：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export interface BranchParts {
  target: string;
  kind: string;
  name: string;
}

/** 三级格式校验：{target}/{kind}/{name}，name 为 kebab-case（小写字母/数字/连字符）。正则自配置派生，配置改集合自动跟随。 */
export function validateBranchName(branch: string, config: WorktreeConfig): { ok: true; parts: BranchParts } | { ok: false; reason: string } {
  const segments = branch.split("/");
  if (segments.length !== 3 || segments.some((s) => s === "")) {
    return { ok: false, reason: `须为三级格式 {目标}/{性质}/{名称}，实际：${branch}` };
  }
  const [target, kind, name] = segments as [string, string, string];
  if (!config.targets.includes(target)) {
    return { ok: false, reason: `目标段 "${target}" 不在目标集 [${config.targets.join(", ")}]` };
  }
  if (!config.kinds.includes(kind)) {
    return { ok: false, reason: `性质段 "${kind}" 不在性质集 [${config.kinds.join(", ")}]` };
  }
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    return { ok: false, reason: `名称段 "${name}" 须为 kebab-case（小写字母/数字/连字符）` };
  }
  return { ok: true, parts: { target, kind, name } };
}

/** 基准分支解析：baseMap 有映射用映射分支名；未映射返回 null = 当前 HEAD（D17 默认） */
export function resolveBaseBranch(target: string, config: WorktreeConfig): string | null {
  return config.baseMap[target] ?? null;
}

/** 执行 git 命令（在 repoRoot 下），返回 { code, stdout, stderr } */
function git(repoRoot: string, args: string[]): { code: number; stdout: string; stderr: string } {
  const result = Bun.spawnSync(["git", "-C", repoRoot, ...args], { stdout: "pipe", stderr: "pipe" });
  return { code: result.exitCode, stdout: result.stdout.toString().trim(), stderr: result.stderr.toString().trim() };
}

/** 命令行入口：ocp worktree <branch>。退出码：0=创建成功；1=git 执行失败；2=用法错误/分支名非法 */
export async function main(args: string[], ctx: { cwd: string }): Promise<number> {
  const positional: string[] = [];
  for (const arg of args) {
    if (arg === "--help" || arg === "-h") {
      console.log("用法：ocp worktree <目标/性质/名称>\n创建 git worktree 到专用目录（默认 ../.ocp-worktrees/），基准分支默认当前 HEAD（configs/worktree-config.json 可配置目标集/性质集/baseMap 映射）");
      return 0;
    }
    positional.push(arg);
  }
  if (positional.length !== 1) {
    console.error("用法：ocp worktree <目标/性质/名称>（如 dev/feat/bd-score-panel）");
    return 2;
  }
  const branch = positional[0] as string;
  const { config, warning } = await loadWorktreeConfig(join(brepoRoot(), "configs", "worktree-config.json"));
  if (warning) {
    console.error(`[worktree] WARN ${warning}`);
  }
  const validated = validateBranchName(branch, config);
  if (!validated.ok) {
    console.error(`分支名非法：${validated.reason}`);
    console.error(`格式：{目标}/{性质}/{名称}——目标 ∈ [${config.targets.join(", ")}]；性质 ∈ [${config.kinds.join(", ")}]；名称为 kebab-case`);
    console.error(`示例：${config.targets[0]}/${config.kinds[0]}/bd-score-panel`);
    return 2;
  }
  // 仓库根解析
  const toplevel = git(ctx.cwd, ["rev-parse", "--show-toplevel"]);
  if (toplevel.code !== 0 || !toplevel.stdout) {
    console.error(`不在 git 仓库中（或 git 不可用）：${toplevel.stderr || "git rev-parse --show-toplevel 无输出"}`);
    return 1;
  }
  const repoRoot = toplevel.stdout;
  // 基准分支：映射优先，否则当前 HEAD
  const mapped = resolveBaseBranch(validated.parts.target, config);
  let base: string;
  if (mapped) {
    base = mapped;
  } else {
    const head = git(repoRoot, ["rev-parse", "HEAD"]);
    if (head.code !== 0 || !head.stdout) {
      console.error(`当前 HEAD 解析失败（空仓库无基准）：${head.stderr}`);
      return 1;
    }
    base = head.stdout;
  }
  // 专用目录：{worktreeDir}/{branch}（branch 含斜杠形成嵌套目录，git 自动创建父级）
  const worktreePath = resolve(repoRoot, config.worktreeDir, branch);
  const created = git(repoRoot, ["worktree", "add", "-b", branch, worktreePath, base]);
  if (created.code !== 0) {
    console.error(`worktree 创建失败：${created.stderr || created.stdout}`);
    return 1;
  }
  const baseDesc = mapped ? `分支 ${mapped}（baseMap 映射）` : `当前 HEAD（${base.slice(0, 12)}）`;
  console.log(`worktree 已创建：${worktreePath}`);
  console.log(`分支：${branch}（基准：${baseDesc}）`);
  console.log("");
  console.log("后续五步（A 仓 10-composition「工作流（5 步）」）：");
  console.log(`  1. 开发：进入 worktree（cd ${worktreePath}），依赖独立安装`);
  console.log("  2. 本地测试通过后整理 commit：每个 commit 能独立编译和通过测试");
  console.log("  3. 推送 + MR：推送分支到远端，创建 MR（dev→主干分支 / rel→发布分支 / ms→主分支）");
  console.log(`  4. 发布测试环境：从发布分支拉出 rel/${validated.parts.kind}/${validated.parts.name}，cherry-pick 干净 commit，建合入发布分支的 MR`);
  console.log(`  5. 发布生产：从发布/主分支拉出 ms/${validated.parts.kind}/${validated.parts.name}，cherry-pick 干净 commit，建合入主分支的 MR`);
  return 0;
}
