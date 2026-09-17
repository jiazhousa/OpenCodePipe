// SpecPipe stage 插件入口（宿主 opencode 插件）。
// D1 loader 约束（宿主 1.18.31 实证）：入口模块的全部运行时导出被逐个视为插件函数，
// 非函数导出抛 TypeError——本入口仅导出 ocpStagePlugin 一个函数；
// 工具实现于 ./stage-ops（测试与消费方从源文件直引，禁止在此 re-export）。
import { tool, type Plugin } from "@opencode-ai/plugin";
import { z } from "zod";
import { STAGE_ACTORS, StageOpError, getStage, setStage } from "./stage-ops";

/** 工作流根默认值（D8）；插件配置元组第二参 { wfRoot } 可覆盖 */
const DEFAULT_WF_ROOT = ".specpipe";

/** 工具错误转 LLM 可读文本：转移非法时附当前状态合法后继清单（D7「零写入返回错误」的出口形态） */
function errorOutput(error: unknown): string {
  if (error instanceof StageOpError) {
    const lines = [`错误：${error.message}`];
    if (error.legalSuccessors && error.legalSuccessors.length > 0) {
      lines.push(`当前状态合法后继：${error.legalSuccessors.join("、")}`);
    }
    return lines.join("\n");
  }
  return `错误：${error instanceof Error ? error.message : String(error)}`;
}

export const ocpStagePlugin: Plugin = async (_input, options) => {
  // wfRoot 取自第二参数 options（D8：宿主 loader 以插件配置元组第二元素作插件函数第二参）
  const wfRoot = typeof options?.wfRoot === "string" && options.wfRoot !== "" ? options.wfRoot : DEFAULT_WF_ROOT;

  const stageGet = tool({
    description:
      "查询 SpecPipe 工作流主题当前所处阶段（读 {wf}/plans/{topic}/.stage）。topic 为主题名（kebab-case，如 bd-score-panel）；未建档或不存在时返回错误说明。",
    args: { topic: z.string() },
    async execute(args, context) {
      try {
        const info = await getStage(context.directory, wfRoot, args.topic);
        return { title: `stage_get ${info.topic}`, output: `topic：${info.topic}\nstage：${info.stage}` };
      } catch (error) {
        return { title: `stage_get ${args.topic}`, output: errorOutput(error) };
      }
    },
  });

  const stageSet = tool({
    description:
      "推进 SpecPipe 工作流主题状态（按转移表校验 from→to 单步合法性）。非法转移零写入并返回错误与当前状态合法后继清单；合法则写 .stage 并追加 .stage-history 流水。actor 取值：调度者 / 审查者。",
    args: { topic: z.string(), to: z.string(), actor: z.enum(STAGE_ACTORS) },
    async execute(args, context) {
      try {
        const record = await setStage(context.directory, wfRoot, args.topic, args.to, args.actor);
        return {
          title: `stage_set ${record.topic}`,
          output: `已转移：${record.from ?? "∅(未建档)"} → ${record.to}（actor：${record.actor}）`,
        };
      } catch (error) {
        return { title: `stage_set ${args.topic}`, output: errorOutput(error) };
      }
    },
  });

  return { tool: { stage_get: stageGet, stage_set: stageSet } };
};
