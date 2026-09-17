// pre-push 校验核心（D5 纯函数）：diff 文件清单 + 仓库根 + 配置 → 放行/拒绝 + 原因/警告。
// 不碰 git 与子进程（git 调用在 hook.ts）——本模块只读工作区文件，可独立测试。
// 口径：
//   白名单命中即代码（D4：agents/** 与 configs/vendor/** 中的 .md 以白名单为准，未命中一律档案类）；
//   topic 提取正则从 archivePrefix 派生（默认 ^\.specpipe/plans/([^/]+)/，配置改前缀自动跟随，防静默降级）；
//   Epic 判定 = topic 目录含 epic-spec.md → 跳过（Epic 终态 ALL_DONE，非本校验对象）；
//   Story/Issue 校验 .stage===DONE（文件不存在视为未完成→拒）；
//   .stage-history 存在则逐行 JSON.parse 找 QUALITY_GATE→DONE 行（容错空格/键序两形态——
//   07 卷示例为空格形态、S2 插件写紧凑形态），存在但无该行 → 拒（状态与留痕矛盾）；
//   history 文件不存在 → 放行 + WARN（存量豁免）；
//   topic 整目录删除（组内全部 diff 路径为 D 标记）不触发校验（D3 删除豁免）。
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** diff 文件条目：path 为仓库相对路径（/ 分隔）；deleted 来自 git diff --name-status 的 D 标记 */
export interface DiffFile {
  path: string;
  deleted: boolean;
}

/** pre-push 配置（configs/prepush-config.json，D4） */
export interface PrepushConfig {
  /** 代码白名单 glob：命中即代码（优先级高于档案类后缀规则） */
  codePatterns: string[];
  /** 工作流档案前缀（topic 提取正则由此派生），默认 ".specpipe/" */
  archivePrefix: string;
}

/** 默认配置——与 configs/prepush-config.json 同值（配置文件缺失/损坏时 hook.ts 以此兜底） */
export const DEFAULT_PREPUSH_CONFIG: PrepushConfig = {
  codePatterns: [
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
  ],
  archivePrefix: ".specpipe/",
};

export interface PrepushDecision {
  decision: "allow" | "reject";
  /** 拒绝原因（违规 topic 清单 + 指引），逐条输出 */
  reasons: string[];
  /** 非阻断提示（存量豁免 / 未关联 topic 等） */
  warnings: string[];
}

/** glob → RegExp：** 匹配任意（含 /），* 匹配段内任意，其余字符按字面转义 */
function globToRegExp(pattern: string): RegExp {
  // ** 先换 NUL 占位再全量转义——转义字符类含 *（正则元字符全量口径），后置会把 ** 拆成 \*\* 致通配失效
  const placeholder = pattern.replace(/\*\*/g, "\u0000");
  const escaped = placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const body = escaped.replace(/\\\*/g, "[^/]*").replace(/\u0000/g, ".*");
  return new RegExp(`^${body}$`);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 读文本文件：不存在返回 null；其他 IO 异常上抛（由调用方 fail-open） */
async function readTextOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/**
 * history 是否含 QUALITY_GATE→DONE 行：逐行 JSON.parse 后比较字段（空格/键序差异天然容错）；
 * 无法解析的坏行跳过（不算命中——history 存在而无该行仍拒，fail-open 只豁免文件缺失）。
 */
function hasQualityGateDoneLine(historyContent: string): boolean {
  for (const line of historyContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const record = JSON.parse(trimmed) as { from?: unknown; to?: unknown };
      if (record.from === "QUALITY_GATE" && record.to === "DONE") {
        return true;
      }
    } catch {
      // 坏行（手写损坏等）跳过，不阻断解析
    }
  }
  return false;
}

/**
 * 校验待推 diff 文件清单。
 * 非缺失性 IO 异常（权限等）上抛，由 hook.ts fail-open 放行——本校验绝不因自身故障硬阻断推送。
 */
export async function evaluatePush(
  files: DiffFile[],
  repoRoot: string,
  config: PrepushConfig,
): Promise<PrepushDecision> {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const codeMatchers = config.codePatterns.map(globToRegExp);

  // ① 全档案（无代码路径）→ 放行
  if (!files.some((file) => codeMatchers.some((matcher) => matcher.test(file.path)))) {
    return { decision: "allow", reasons, warnings };
  }

  // ② topic 提取与删除豁免：正则从 archivePrefix 派生；组内全部 D 标记的 topic 不触发校验
  const prefix = config.archivePrefix.endsWith("/") ? config.archivePrefix : `${config.archivePrefix}/`;
  const topicRegex = new RegExp(`^${escapeRegExp(prefix)}plans/([^/]+)/`);
  const groups = new Map<string, DiffFile[]>();
  for (const file of files) {
    const topic = topicRegex.exec(file.path)?.[1];
    if (topic === undefined) continue;
    const group = groups.get(topic) ?? [];
    group.push(file);
    groups.set(topic, group);
  }
  const topics = [...groups.entries()]
    .filter(([, group]) => group.some((file) => !file.deleted))
    .map(([topic]) => topic);

  // ③ 代码无 topic → WARN 放行
  if (topics.length === 0) {
    warnings.push(`代码变更未关联任何工作流 topic（${prefix}plans/{topic}/），跳过状态校验`);
    return { decision: "allow", reasons, warnings };
  }

  const plansRoot = join(repoRoot, prefix, "plans");
  for (const topic of topics) {
    const topicDir = join(plansRoot, topic);

    // Epic 判定：目录含 epic-spec.md → 跳过
    if (existsSync(join(topicDir, "epic-spec.md"))) {
      continue;
    }

    // .stage：不存在/空文件/非 DONE 均视为未完成 → 拒
    const stageRaw = await readTextOrNull(join(topicDir, ".stage"));
    const stage = stageRaw?.trim() || null;
    if (stage !== "DONE") {
      reasons.push(
        `topic「${topic}」未完成质量门（.stage=${stage ?? "缺失"}，须 DONE）——完成质量门后重推，或 git push --no-verify 跳过校验`,
      );
      continue;
    }

    // .stage-history：存在则须含 QUALITY_GATE→DONE 行；不存在 → 存量豁免（WARN）
    const history = await readTextOrNull(join(topicDir, ".stage-history"));
    if (history === null) {
      warnings.push(`topic「${topic}」.stage=DONE 但 .stage-history 缺失（存量豁免，建议补留痕）`);
      continue;
    }
    if (!hasQualityGateDoneLine(history)) {
      reasons.push(
        `topic「${topic}」状态与留痕矛盾：.stage=DONE 但 .stage-history 无 QUALITY_GATE→DONE 行——完成质量门后重推，或 git push --no-verify 跳过校验`,
      );
    }
  }

  return { decision: reasons.length > 0 ? "reject" : "allow", reasons, warnings };
}
