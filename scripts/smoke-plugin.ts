// D12 插件冒烟（双形状版）：import 入口 default →
//   V1 链路：调 server(input, options) stub PluginInput（directory=mkdtemp 临时目录）
//     → 断言 hooks.tool 含 stage_get/stage_set → zod schema 解析合法入参成功 / 非法 actor 被拒
//     → 调 execute 全链路（临时目录内：建档→推进→非法拒绝，覆盖 entry→execute→stage-ops）。
//   V2 链路：stub 最小 V2 ctx（tool.transform 收集 editor.add）调 setup()
//     → 断言注册 stage_get/stage_set（JSON Schema input）→ execute 返回 { content } 同链路语义
//     → 形态防御：非 V2 ctx（无 tool.transform）调用 setup 不炸不注册。
// 运行：bun scripts/smoke-plugin.ts（fence 第三步）。
import { strict as assert } from "node:assert";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { z } from "zod";
import type { PluginInput, ToolContext } from "@opencode-ai/plugin";
import plugin from "../src/plugin/index";

/** 提取 execute 返回的 output 文本（ToolResult 的 string / 对象两形态归一） */
function outputOf(result: unknown): string {
  if (typeof result === "string") return result;
  const output = (result as { output?: unknown }).output;
  assert(typeof output === "string", "execute 返回须为 string 或含 string output 的对象");
  return output;
}

/** 提取 V2 execute 返回的 content 文本 */
function contentOf(result: unknown): string {
  const content = (result as { content?: unknown }).content;
  assert(typeof content === "string", "V2 execute 返回须含 string content");
  return content;
}

const directory = await mkdtemp(join(tmpdir(), "ocp-smoke-"));
try {
  // ---- 1. V1 链路：server() 取 V1 返回值（stub PluginInput：directory 指向临时目录；其余字段不为本插件消费） ----
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
  const hooks = await plugin.server(input, { wfRoot: ".specpipe" });

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

  // ---- 5. V2 链路：setup(ctx) 注册 + execute { content } 返回 ----
  const v2tools: Array<{ name: string; input: Record<string, unknown>; execute: (raw: unknown) => Promise<unknown> }> = [];
  const v2ctx = {
    options: { wfRoot: ".specpipe" },
    location: { directory },
    tool: {
      transform: async (fn: (editor: { add: (def: unknown) => void }) => void) => {
        await fn({ add: (def) => v2tools.push(def as (typeof v2tools)[number]) });
      },
    },
  };
  await plugin.setup(v2ctx);
  assert.deepStrictEqual(
    v2tools.map((t) => t.name).sort(),
    ["stage_get", "stage_set"],
    "V2 transform 应注册 stage_get/stage_set",
  );
  const v2Set = v2tools.find((t) => t.name === "stage_set");
  assert(v2Set, "V2 stage_set 应存在");
  const schemaProps = (v2Set.input as { properties?: Record<string, { enum?: string[] }> }).properties;
  assert.deepStrictEqual(schemaProps?.actor?.enum, ["调度者", "审查者"], "V2 actor 入参应为枚举（JSON Schema enum）");

  // 5a. V2 execute 全链路（临时目录独立主题，验证目录锚与 { content } 返回）
  const v2topic = "smoke-topic-v2";
  const v2created = contentOf(await v2Set.execute({ topic: v2topic, to: "SPEC_DRAFT", actor: "调度者" }));
  assert(!v2created.includes("错误") && v2created.includes("SPEC_DRAFT"), `V2 建档应成功：${v2created}`);
  const v2Get = v2tools.find((t) => t.name === "stage_get");
  assert(v2Get, "V2 stage_get 应存在");
  const v2queried = contentOf(await v2Get.execute({ topic: v2topic }));
  assert(v2queried.includes("SPEC_DRAFT"), `V2 查询应成功：${v2queried}`);
  const v2rejected = contentOf(await v2Set.execute({ topic: v2topic, to: "DONE", actor: "调度者" }));
  assert(v2rejected.includes("错误") && v2rejected.includes("SPEC_REVIEWING"), `V2 跳级应报错并附后继：${v2rejected}`);

  // ---- 6. 形态防御：非 V2 ctx（无 tool.transform）调用 setup 不炸不注册（1.18.31 误调实证场景） ----
  const before = v2tools.length;
  await plugin.setup({} as Parameters<typeof plugin.setup>[0]);
  await plugin.setup(undefined as unknown as Parameters<typeof plugin.setup>[0]);
  assert.strictEqual(v2tools.length, before, "非 V2 ctx 调 setup 不应触发注册");

  console.log(`smoke PASS：stage 插件双形状（V1 server + V2 setup + 形态防御）全链路（目录 ${directory}）`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
