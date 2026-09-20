# issue-impl：ocp-plugin-dual-compat（插件双版本兼容 1.18.x + 2.x）

## 背景

OpenCode 发布 V2（2.0.10 beta，npm 渠道分发）。V2 插件 API 全面重写：V1 插件实现不在 V2 运行（官方 breaking change）。用户要求：修改完毕后兼容 1.18.x 与 2.x；若不可兼容则优先 2.x。

## 实验实证（2026-09-20，本会话，报告见本目录 experiment-record.md）

### 入口协议（双形状可行）

- **1.18.31**（本机生产版）：default 对象入口（≥1.18.29 支持）——调 `server()` 取 V1 返回值 ✅；同时误调 `setup()` 但传入非 V2 ctx（无 `tool.transform` 域）→ setup 内形态防御静默跳过 ✅
- **2.0.10**（npm `@opencode/cli-linux-x64` 独立路径验证）：只调 `setup(ctx)`（真 V2 ctx 含 `tool.transform`）✅，不调 `server()` ✅；手写形状（不经 `Plugin.define()` 构造）被接受
- 同一 `export default {id, setup, server}` 两版本通吃，互不干扰

### 挂载发现（矩阵 8 形态，run 触发 + MARK 文件硬观测）

| 形态 | 2.0.10 | 1.18.31 |
|---|---|---|
| 配置 `"plugin"` 键（V1 键，file://目录/单文件/tuple） | ❌ 不生效（单文件报 WARN must be a directory；目录静默不加载） | ✅（生产现状） |
| 配置 `"plugins"` 键（V2 键，file://目录/裸目录/{package}对象） | ❌ 全不生效（beta 未实现/有 bug） | 不适用 |
| **`.opencode/plugins/` 约定目录**（拷贝单文件/symlink 目录/symlink 单 .ts/转发壳） | ✅ 全形态可靠 | 不读取（V1 无此约定） |

- 陷阱记录：`opencode plugin list` 只列注册表、**不触发加载**，不能作加载判据（曾致矩阵误判，重跑修正）
- V2 共享后台服务持有启动时配置，调试须 `--standalone` 或先杀服务（`pgrep -f opencode.*serve`）

### 运行时依赖解析

插件文件顶层 `import "@opencode-ai/plugin"` / `zod` 的解析锚是**文件物理位置**（B 仓 node_modules 在旁）——1.18（配置式挂载）与 2.x（symlink 挂载，解析仍锚 B 仓真实路径）均可解析，无需改动。`@opencode/plugin`（V2 新 SDK）**不引入运行时 import**（1.18 宿主下不存在该包会炸）；仅 devDep 提供类型。

## 方案（双兼容，非 2.x-only）

### 改动清单

| 文件 | 改动 |
|---|---|
| `src/plugin/index.ts` | **重写为双形状 default export**：① `id`（"ocp-stage"）② `setup(ctx)` V2 注册薄层：形态防御（`ctx?.tool?.transform` 非函数即 return）→ `ctx.tool.transform(editor => editor.add(...))` 注册 stage_get/stage_set（JSON Schema input，execute 返回 `{content}`，目录锚 `ctx.location.directory`，wfRoot 取 `ctx.options.wfRoot`）③ `server(input, options)` V1 注册薄层：保留现 tool()+zod 实现（named export `ocpStagePlugin` 改为 default 对象成员；工具描述文本两处保持同源）。**stage-ops.ts 零改动** |
| `cli/commands/doctor.ts` | 挂载检查扩展：现有 V1 配置键检查之外，新增 V2 约定目录检查——`{project}/.opencode/plugins/` 下条目（含 symlink 解析目标）含 `opencodepipe/src/plugin` 即 PASS；检查行文案标注形态（V1 配置 / V2 约定目录） |
| `scripts/smoke-plugin.ts` | 适配双形状：V1 冒烟（调 `default.server()` 断言 tool map + execute 链路）+ V2 冒烟（stub ctx.tool.transform 收集 editor.add，断言注册与 `{content}` 返回） |
| `tests/`（引用入口的用例） | 同步适配 default 形状 |
| `docs/BOOTSTRAP.md` | 双版本安装/挂载说明：V2 installer（`https://opencode.ai/v2/install`）+ 约定目录 symlink 铺设步骤 + V1 ≥1.18.29 兼容线 |
| `docs/cli-usage.md` | doctor 挂载检查输出示例更新 |
| `package.json` | devDep 加 `@opencode/plugin`（V2 类型，`2.0.*`）；保留 `@opencode-ai/plugin` |

### 不改的部分（明确边界）

- `src/plugin/stage-ops.ts`（状态机核心）——零改动
- V1 挂载现状（全局配置 `plugin` 键 file://B仓）——不动；V2 用户按 BOOTSTRAP 新增约定目录 symlink
- agents / 转移表 / check-tools / fence 结构——不动

### 联调锚点（实现后待 V2 正式环境复核）

1. V2 execute 的 per-call context 是否携带会话目录（当前按 `ctx.location.directory` 闭包捕获——项目级挂载语义等价；多 workspace 场景待正式版复核）
2. V2 正式版若修复配置式 plugins 键挂载 → doctor 双轨提示可简化，symlink 方案仍兼容（约定目录是官方文档路径）

## 验证方式

- `bun run typecheck` + `bun test`（smoke 与单测全绿）
- `bun run fence` 四步全绿
- 实机双版本验证：1.18.31 生产环境（本会话即证——插件全局挂载，stage_get/stage_set 可用）；2.0.10 独立路径 binary + 约定目录 symlink 挂载，run 触发后 stage 工具可调（模型 500 故障期间以 MARK/加载为准）
