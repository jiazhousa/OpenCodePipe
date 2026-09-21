// stage 工具核心实现——读写 {wf}/plans/{topic}/.stage 与 .stage-history（A 仓 07 卷「状态文件」契约）。
// 与入口解耦：宿主 loader 约束下入口仅导出插件函数（D1），本模块由插件入口与测试直引，不经入口 re-export。
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { getLegalSuccessors, initialStateNames, isKnownState, isLegalTransition } from "../core/table";
import { isValidTopic, resolveStagePaths } from "../core/paths";

/** actor 取值（07 卷「状态更新职责分工」：调度者/审查者）——插件 zod schema 与本模块共用同一事实源 */
export const STAGE_ACTORS = ["调度者", "审查者"] as const;
export type StageActor = (typeof STAGE_ACTORS)[number];

export type StageOpErrorCode = "TOPIC_INVALID" | "STAGE_NOT_FOUND" | "STAGE_INVALID" | "TRANSITION_ILLEGAL";

/** 结构化操作错误：code 供调用方分支；legalSuccessors（去重）为转移非法时的合法后继清单 */
export class StageOpError extends Error {
  readonly code: StageOpErrorCode;
  readonly legalSuccessors?: string[];

  constructor(code: StageOpErrorCode, message: string, legalSuccessors?: string[]) {
    super(message);
    this.name = "StageOpError";
    this.code = code;
    this.legalSuccessors = legalSuccessors;
  }
}

/** topic 前置拦截：非法形态零副作用（不进 resolveStagePaths，不创建任何目录） */
function assertTopic(topic: string): void {
  if (!isValidTopic(topic)) {
    throw new StageOpError("TOPIC_INVALID", `topic 非法（须 kebab-case：小写字母/数字/连字符，如 my-topic）：${topic}`);
  }
}

/** ISO8601 本地时区偏移格式（如 2026-09-16T21:00:00+08:00）——与 07 卷 history 示例一致 */
function localIsoTimestamp(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMinutes);
  const pad = (value: number): string => String(value).padStart(2, "0");
  const offset = `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
  const local = new Date(date.getTime() + offsetMinutes * 60_000);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}${offset}`
  );
}

export interface StageInfo {
  topic: string;
  stage: string;
}

/** history 行结构（字段插入序即 JSONL 输出序：ts/topic/from/to/actor，07 卷契约） */
export interface StageHistoryRecord {
  ts: string;
  topic: string;
  /** 变更前状态名；建档行为 null */
  from: string | null;
  to: string;
  actor: StageActor;
}

/** 读 .stage：无文件视为未建档，报 STAGE_NOT_FOUND（get 是查询语义，不静默返回 null，也不创建任何目录） */
export async function getStage(directory: string, wfRoot: string, topic: string): Promise<StageInfo> {
  assertTopic(topic);
  const { stagePath } = await resolveStagePaths(directory, wfRoot, topic);
  let content: string;
  try {
    content = await readFile(stagePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new StageOpError("STAGE_NOT_FOUND", `topic「${topic}」不存在 .stage（未建档，或 Issue 升级时已清理）`);
    }
    throw error;
  }
  const stage = content.trim();
  if (!stage) {
    throw new StageOpError("STAGE_NOT_FOUND", `topic「${topic}」的 .stage 为空文件（视为未建档）`);
  }
  // 状态名合法性校验：识别绕过 stage_set 的直写产物（如阶段编号 I-S3 误作状态常量落盘）
  if (!isKnownState(stage)) {
    throw new StageOpError(
      "STAGE_INVALID",
      `topic「${topic}」的 .stage 内容不是合法状态名：${stage}（不在状态常量表，疑似绕过 stage_set 直写）——请修正为合法常量（见 07-state-machine 转移表）或清理该文件后经 stage_set 建档`,
    );
  }
  return { topic, stage };
}

/**
 * 推进状态（D7 原子语义）：先完整校验——topic 格式 → 读当前 .stage（无文件视为 from=null）→ 查转移边；
 * 任一失败零写入抛 StageOpError（转移非法附去重 legalSuccessors）；全部通过才写 .stage（单行状态名+换行）
 * 并追加 .stage-history。actor 仅入档 history，不参与边校验（07 卷职责分工由调用侧约束，见 core/table）。
 * 写者模型为单写者假设（调度者+审查者经会话串行使用）；history 以 appendFile（O_APPEND）追加，
 * 单行 ≤ PIPE_BUF 原子——.stage 写入成功而 history 追加失败的理论窗口由单写者顺序写约束兜底。
 */
export async function setStage(
  directory: string,
  wfRoot: string,
  topic: string,
  to: string,
  actor: StageActor,
): Promise<StageHistoryRecord> {
  assertTopic(topic);
  // 校验阶段 ensure=false：查询与非法路径不创建 plansDir（零写入严格口径，目录副作用与文件副作用一并归零）
  const { stagePath, historyPath, plansDir } = await resolveStagePaths(directory, wfRoot, topic);
  let from: string | null = null;
  try {
    from = (await readFile(stagePath, "utf8")).trim() || null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
    // 无 .stage 文件：视为未建档（from=null），建档边校验限定 initial 三态
  }
  // 状态名合法性前置校验（先于转移校验，零写入语义不变）：直写产物与笔误目标均在此识别，
  // 报错语义区分于 TRANSITION_ILLEGAL（状态名非法 ≠ 转移非法），防误导排障方向
  if (from !== null && !isKnownState(from)) {
    throw new StageOpError(
      "STAGE_INVALID",
      `当前状态名非法：${from}（不在状态常量表，疑似绕过 stage_set 直写）——请修正 .stage 为合法常量（见 07-state-machine 转移表）或清理该文件后经 stage_set 建档（建档目标：${initialStateNames().join("、")}）`,
    );
  }
  if (!isKnownState(to)) {
    // from 终态（DONE/ALL_DONE）时无后继，尾段非空才拼接防空悬
    const successors = getLegalSuccessors(from);
    const successorHint = successors.length > 0 ? `；当前合法后继：${successors.join("、")}` : "";
    throw new StageOpError(
      "STAGE_INVALID",
      `目标状态名非法：${to}（不在状态常量表）——未建档时合法建档目标：${initialStateNames().join("、")}${successorHint}`,
    );
  }
  if (!isLegalTransition(from, to)) {
    throw new StageOpError(
      "TRANSITION_ILLEGAL",
      `非法转移：${from ?? "∅(未建档)"} → ${to}`,
      getLegalSuccessors(from),
    );
  }
  // 校验全过，进入写入区：先铺设目录再写文件
  await mkdir(plansDir, { recursive: true });
  await writeFile(stagePath, `${to}\n`, "utf8");
  const record: StageHistoryRecord = { ts: localIsoTimestamp(new Date()), topic, from, to, actor };
  await appendFile(historyPath, `${JSON.stringify(record)}\n`, "utf8");
  return record;
}
