// {wf} 解析与 .stage 路径计算——07 卷「状态文件」段（{wf}/plans/{topic}/.stage 与 .stage-history）的路径层。
import { mkdir } from "node:fs/promises";
import { isAbsolute, join, resolve } from "node:path";

/** topic 合法格式：kebab-case（06-artifacts.md 取值规则）——同时拒绝路径逃逸（../）、大写、空串等形态 */
const TOPIC_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** topic 格式校验（独立导出供参数层提前拦截） */
export function isValidTopic(topic: string): boolean {
  return TOPIC_PATTERN.test(topic);
}

export interface StagePaths {
  /** {wf}/plans/{topic}（已确保存在） */
  plansDir: string;
  /** {wf}/plans/{topic}/.stage */
  stagePath: string;
  /** {wf}/plans/{topic}/.stage-history */
  historyPath: string;
}

/**
 * 解析 topic 的三路径并铺设 plansDir（幂等，recursive）。
 * @param directory 工作目录（宿主 ToolContext.directory 或进程 cwd）
 * @param wfRoot 工作流根：相对路径基于 directory 解析为绝对路径；绝对路径原样使用
 */
export async function resolveStagePaths(
  directory: string,
  wfRoot: string,
  topic: string,
): Promise<StagePaths> {
  if (!isValidTopic(topic)) {
    throw new Error(`topic 非法（须 kebab-case：小写字母/数字/连字符，如 my-topic）：${topic}`);
  }
  const wfRootAbs = isAbsolute(wfRoot) ? wfRoot : resolve(directory, wfRoot);
  const plansDir = join(wfRootAbs, "plans", topic);
  await mkdir(plansDir, { recursive: true });
  return { plansDir, stagePath: join(plansDir, ".stage"), historyPath: join(plansDir, ".stage-history") };
}
