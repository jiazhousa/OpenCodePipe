// SpecPipe stage 插件入口（宿主 opencode 插件）——双形状兼容 1.18.x + 2.x。
// 实证依据（2026-09-20，.specpipe/plans/ocp-plugin-dual-compat/experiment-record.md）：
//   V1（1.18.31，≥1.18.29 支持 object entrypoint）：宿主调 default.server() 取 V1 返回值；
//     同时误调 setup() 但传入非 V2 ctx（无 tool.transform 域）——setup 内形态防御静默跳过。
//   V2（2.0.10）：宿主只调 default.setup(ctx)（真 V2 ctx，含 tool.transform 等域），不调 server()。
//   手写形状不经 Plugin.define() 构造：运行时零依赖 @opencode/plugin 新包（1.18 宿主下该包不存在，
//   import 会炸）；@opencode/plugin 仅作 devDep 提供类型参考，本文件用本地最小 interface。
// D1 loader 约束（宿主 1.18.31 实证）：入口模块的全部 named 运行时导出被逐个视为插件函数，
//   非函数导出抛 TypeError——本入口禁止任何 named 运行时导出（仅 default 对象 + type 导出）；
//   工具实现于 ./stage-ops（测试与消费方从源文件直引，禁止在此 re-export）。
// V2 挂载注意（2.0.10 实证）：配置式 plugin/plugins 键均不生效，唯一可靠发现路径为
//   项目约定目录 .opencode/plugins/（推荐 symlink 单 .ts 指向本文件，见 docs/BOOTSTRAP.md）。
import { tool, type Plugin } from "@opencode-ai/plugin";
import { z } from "zod";
import { STAGE_ACTORS, StageOpError, getStage, setStage } from "./stage-ops";

/** 工作流根默认值（D8）；V1 插件配置元组第二参 / V2 ctx.options 的 { wfRoot } 可覆盖 */
const DEFAULT_WF_ROOT = ".specpipe";

/** 工具描述文本（V1/V2 两注册薄层同源，防双份漂移） */
const STAGE_GET_DESC =
  "查询 SpecPipe 工作流主题当前所处阶段（读 {wf}/plans/{topic}/.stage）。topic 为主题名（kebab-case，如 bd-score-panel）；未建档或不存在时返回错误说明。";
const STAGE_SET_DESC =
  "推进 SpecPipe 工作流主题状态（按转移表校验 from→to 单步合法性）。非法转移零写入并返回错误与当前状态合法后继清单；合法则写 .stage 并追加 .stage-history 流水。actor 取值：调度者 / 审查者。";

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

// ---------- V2 侧类型（本地最小 interface，官方完整 API 见 @opencode/plugin） ----------

/** V2 工具定义（ctx.tool.transform 的 editor.add 入参形态） */
interface V2ToolDef {
  name: string;
  description: string;
  input: Record<string, unknown>;
  execute: (input: unknown) => Promise<unknown>;
}

/** V2 editor：transform 回调收到的注册编辑器 */
interface V2ToolEditor {
  add: (def: V2ToolDef) => void;
}

/** V2 插件上下文（仅声明本插件消费的域；location=插件实例加载位置，非每次会话目录） */
interface V2PluginCtx {
  options?: { wfRoot?: string };
  location?: { directory?: string };
  tool?: { transform?: (fn: (editor: V2ToolEditor) => void) => Promise<void> };
}

/** V2 双形状入口（2.x 宿主调 setup；1.18.31 误调时传非 V2 ctx，形态防御直接返回） */
async function setup(ctx: V2PluginCtx): Promise<void> {
  if (!ctx || typeof ctx.tool?.transform !== "function") return;
  const wfRoot = typeof ctx.options?.wfRoot === "string" && ctx.options.wfRoot !== "" ? ctx.options.wfRoot : DEFAULT_WF_ROOT;
  // 目录锚：V2 工具 execute 无 per-call context，取插件实例加载位置（项目级约定目录挂载下即项目根，
  // 与 V1 的会话目录语义等价；多 workspace 场景待 V2 正式版复核——issue-impl 联调锚点 1）
  const directory = ctx.location?.directory ?? process.cwd();

  await ctx.tool.transform((editor) => {
    editor.add({
      name: "stage_get",
      description: STAGE_GET_DESC,
      input: {
        type: "object",
        properties: { topic: { type: "string", description: "主题名（kebab-case）" } },
        required: ["topic"],
        additionalProperties: false,
      },
      async execute(raw) {
        const args = raw as { topic: string };
        try {
          const info = await getStage(directory, wfRoot, args.topic);
          return { content: `topic：${info.topic}\nstage：${info.stage}` };
        } catch (error) {
          return { content: errorOutput(error) };
        }
      },
    });
    editor.add({
      name: "stage_set",
      description: STAGE_SET_DESC,
      input: {
        type: "object",
        properties: {
          topic: { type: "string", description: "主题名（kebab-case）" },
          to: { type: "string", description: "目标状态" },
          actor: { type: "string", enum: [...STAGE_ACTORS], description: "执行角色" },
        },
        required: ["topic", "to", "actor"],
        additionalProperties: false,
      },
      async execute(raw) {
        const args = raw as { topic: string; to: string; actor: (typeof STAGE_ACTORS)[number] };
        try {
          const record = await setStage(directory, wfRoot, args.topic, args.to, args.actor);
          return { content: `已转移：${record.from ?? "∅(未建档)"} → ${record.to}（actor：${record.actor}）` };
        } catch (error) {
          return { content: errorOutput(error) };
        }
      },
    });
  });
}

/** V1 插件函数体（object entrypoint 的 server() 方法，宿主 1.18.x ≥1.18.29 调用） */
const server: Plugin = async (_input, options) => {
  // wfRoot 取自第二参数 options（D8：宿主 loader 以插件配置元组第二元素作插件函数第二参）
  const wfRoot = typeof options?.wfRoot === "string" && options.wfRoot !== "" ? options.wfRoot : DEFAULT_WF_ROOT;

  const stageGet = tool({
    description: STAGE_GET_DESC,
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
    description: STAGE_SET_DESC,
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

// 双形状 default：V1 调 server()（V1 语义返回值）/ V2 调 setup()；id 为 V2 插件稳定标识
export default { id: "ocp-stage", setup, server };
