// D12 插件冒烟：import 入口 → stub PluginInput（directory=mkdtemp 临时目录）+ options 调插件函数
// → 断言 hooks.tool 含 stage_get/stage_set → zod schema 解析合法入参成功 / 非法 actor 被拒
// → 调 execute 全链路（临时目录内：建档→推进→非法拒绝，覆盖 entry→execute→stage-ops）。
// 运行：bun scripts/smoke-plugin.ts（fence 第三步）。
import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { PluginInput, ToolContext } from "@opencode-ai/plugin";
import { ocpStagePlugin } from "../src/plugin/index";

/** 提取 execute 返回的 output 文本（ToolResult 的 string / 对象两形态归一） */
function outputOf(result: unknown): string {
  if (typeof result === "string") return result;
  const output = (result as { output?: unknown }).output;
  assert(typeof output === "string", "execute 返回须为 string 或含 string output 的对象");
  return output;
}

const directory = await mkdtemp(join(tmpdir(), "ocp-smoke-"));
try {
  // ---- 1. 调插件函数（stub PluginInput：directory 指向临时目录；其余字段不为本插件消费） ----
  const input = {
    directory,
    worktree: directory,
    client: {},
    project: {},
    experimental_workspace: { register: () => {} },
    serverUrl: new URL("http://127.0.0.1:1"),
    $: () => {
      throw new Error("smoke stub 不消费 shell");
    },
  } as unknown as PluginInput;
  const hooks = await ocpStagePlugin(input, { wfRoot: ".specpipe" });

  // ---- 2. hooks.tool 注册面 ----
  assert(hooks.tool, "插件未注册任何工具");
  assert.deepStrictEqual(
    Object.keys(hooks.tool).sort(),
    ["stage_get", "stage_set"],
    "hooks.tool 键集应为 stage_get/stage_set",
  );

  // ---- 3. zod schema：合法入参解析成功 / 非法 actor 被拒 ----
  const schema = z.object(hooks.tool.stage_set.args);
  const legal = schema.safeParse({ topic: "smoke-topic", to: "SPEC_DRAFT", actor: "调度者" });
  assert(legal.success, `合法入参应解析成功：${JSON.stringify(legal)}`);
  const illegal = schema.safeParse({ topic: "smoke-topic", to: "SPEC_DRAFT", actor: "用户" });
  assert(!illegal.success, "非法 actor（用户）应被 zod 拒绝");

  // ---- 4. execute 全链路（路径基于 context.directory 解析，不依赖 process.cwd()） ----
  const context = {
    sessionID: "smoke-session",
    messageID: "smoke-message",
    agent: "smoke",
    directory,
    worktree: directory,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  } as unknown as ToolContext;
  const topic = "smoke-topic";

  // 4a. 建档：∅ → SPEC_DRAFT
  const created = outputOf(await hooks.tool.stage_set.execute({ topic, to: "SPEC_DRAFT", actor: "调度者" }, context));
  assert(!created.includes("错误"), `建档应成功：${created}`);
  assert(created.includes("SPEC_DRAFT"), `建档输出应含目标态：${created}`);

  // 4b. 推进：SPEC_DRAFT → SPEC_REVIEWING
  const advanced = outputOf(await hooks.tool.stage_set.execute({ topic, to: "SPEC_REVIEWING", actor: "调度者" }, context));
  assert(!advanced.includes("错误"), `推进应成功：${advanced}`);
  assert(advanced.includes("SPEC_REVIEWING"), `推进输出应含目标态：${advanced}`);

  // 4c. 非法拒绝：SPEC_REVIEWING → IMPL_APPROVED（跳级）——错误文本附合法后继，零写入
  const rejected = outputOf(await hooks.tool.stage_set.execute({ topic, to: "IMPL_APPROVED", actor: "审查者" }, context));
  assert(rejected.includes("错误"), `跳级转移应报错：${rejected}`);
  assert(rejected.includes("SPEC_USER_AUDIT"), `错误应附合法后继：${rejected}`);

  // 4d. stage_get 复验：非法拒绝后状态停留在推进后态
  const queried = outputOf(await hooks.tool.stage_get.execute({ topic }, context));
  assert(!queried.includes("错误"), `查询应成功：${queried}`);
  assert(queried.includes("SPEC_REVIEWING"), `非法拒绝后状态应保持 SPEC_REVIEWING：${queried}`);

  console.log(`smoke PASS：stage 插件 entry→execute→stage-ops 全链路（目录 ${directory}）`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
