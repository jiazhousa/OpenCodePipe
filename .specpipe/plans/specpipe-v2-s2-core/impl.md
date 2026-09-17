# Impl: Story 2 —— B 仓核心（骨架 + 转移表数据 + stage 插件 + agents）

## 技术方案

### 总体策略

单包 `opencodepipe`，TypeScript + Bun（先例：OpenCodeQuota 工程），`src/`（代码）与 `configs/`（数据）与 `agents/`（定义资产）分层；plugin 与未来 check-tools 共经 `src/core/` 消费同一份转移表数据文件。任务切分三块：**块1 骨架+数据文件（串行先行）→ 块2 插件 ∥ 块3 agents 迁移（并行，文件集不相交）**。

### 决策记录

| # | 决策 | 内容与理由 |
|---|---|---|
| D1 | 包结构 | 单包：`name: opencodepipe`、`type: module`；`exports: { "./plugin": "./src/plugin/index.ts" }`（插件入口，S3 增 `./cli`）；`bin: { "ocp": "./cli/index.ts" }`（槽位占位——文件存在、内容为 `console.error("S3 交付")` + `process.exit(1)`） |
| D2 | 工程基线 | bun + `tsc --noEmit`（typecheck）；tsconfig 参照 OpenCodeQuota 裁剪（去 JSX/`@opentui`，保留 strict / Bundler resolution / `types: ["bun"]` / noEmit / verbatimModuleSyntax） |
| D3 | 版本 | devDependencies 仅 `@opencode-ai/plugin: "1.18.*"`（不用 `@opencode-ai/sdk`——不消费 `PluginInput.client`）；lockfile（bun.lock）入库 |
| D4 | 转移表 schema | `configs/transition-table.json`：`{ version, source, states[], transitions[], history }`。state：`{ name, path: "epic"|"story"|"issue", initial?: true, blocking?: true, terminal?: true }`；transition：`{ from, to, actor: "调度者"|"审查者", trigger }`（trigger 自由文本：`流程推进` / `spec审查PASS` / `spec审查REJECT` / `REJECT:SPEC_OVERTURN` / `用户放行` / `全部Story DONE` 等）；建档边以 `from: null` 表达（三初始态各一条，actor=调度者，trigger=`建档`）；history 段声明 JSONL 字段契约（ts/topic/from/to/actor，from 建档时为 null）。**阻塞语义（blocking）/终态（terminal）作为状态属性表达；S2 重分级与中断恢复是调度者行为规则，不进转移表**（与 07 卷分工一致，07 卷亦为叙述性规则） |
| D5 | 状态与转移清单 | 状态 21 个：**Epic 5（含 ALL_DONE，terminal）**、Story 10、Issue 6。转移边 23 条 + 建档边 3 条：Epic 5（DRAFT→REVIEWING / REVIEWING→USER_AUDIT(PASS) / REVIEWING→DRAFT(REJECT) / USER_AUDIT→APPROVED(用户放行) / APPROVED→ALL_DONE(全部Story DONE)）；Story 12（DRAFT→REVIEWING / REVIEWING→USER_AUDIT / REVIEWING→DRAFT / USER_AUDIT→APPROVED / SPEC_APPROVED→IMPL_DRAFT / IMPL_DRAFT→IMPL_REVIEWING / IMPL_REVIEWING→IMPL_APPROVED(PASS) / IMPL_REVIEWING→IMPL_DRAFT(REJECT) / IMPL_REVIEWING→SPEC_DRAFT(OVERTURN) / IMPL_APPROVED→WORKING / WORKING→QUALITY_GATE / QUALITY_GATE→DONE(PASS) / QUALITY_GATE→WORKING(REJECT)）；Issue 6（同构：DRAFT→REVIEWING / PASS / REJECT / OVERTURN 回 ISSUE_IMPL_DRAFT 与 REJECT 同目标边分列（trigger 不同）/ APPROVED→WORKING / WORKING→QUALITY_GATE / QUALITY_GATE→DONE / QUALITY_GATE→WORKING——Issue 与 Story 共享 WORKING/QUALITY_GATE/DONE 状态，边不重复声明，见 D6 说明）。精确以 07 卷逐条核对为准，数据文件头部 `source` 字段记录 A 仓 commit |
| D6 | 三路径共享态 | WORKING / QUALITY_GATE / DONE 为 Story 与 Issue 共享（07 卷两链同名同义）；数据文件 state.path 标 `"story"`，transitions 中 Issue 链引用同名态；Epic 的 ALL_DONE 独占。校验器对共享态不区分路径来源（07 卷未区分，保持等价） |
| D7 | stage 工具契约 | `stage_get(args: { topic: string })` → 返回 `{topic, stage}` 或 topic 不存在错误；`stage_set(args: { topic: string, to: string, actor: "调度者"|"审查者" })` → 读当前 `.stage`（无文件视为 from=null）→ 查转移边（from 匹配 + to 匹配；from=null 时 to 必须为 initial）→ 不合法则**返回错误 + 当前状态合法后继清单，零写入** → 合法则写 `.stage`（单行状态名）+ 追加 `.stage-history` JSONL（ts=ISO8601 本地时区偏移格式，与 07 卷示例一致）。zod schema：`args: { topic: z.string(), to: z.string(), actor: z.enum(["调度者","审查者"]) }` |
| D8 | {wf} 解析 | 工具内 `wfRoot` 默认 `.specpipe`，基于 `ToolContext.directory` 解析为绝对路径；插件以 PluginOptions 元组形态接受 `options.wfRoot` 覆盖（`opencode.json: "plugin": [["<入口>", { "wfRoot": ".specpipe" }]]`）——用户决策位 |
| D9 | 本地分发 | 主方案：`opencode.json` 的 `plugin` 数组直接引用本地入口路径（绝对路径或 `~/` 展开）；回退方案：`~/.config/opencode/plugins/ocp-stage.ts` boot 文件一行 re-export 绝对路径入口。**验收 3 手验时确认主方案可行性，不可行则固化回退方案进 README** |
| D10 | agents 迁移适配 | 五文件自 `~/.config/opencode/agents/`（v1 现役，476 行）迁入 `agents/`，适配四点：① 文件头注释加对口声明（如 `<!-- 对口 A 仓 08-roles.md「五角色职责矩阵」/「调度协议」 -->`）；② oracle 的 `model`/`variant` 改占位（`model: "<provider/model 占位，用户决策位>"` 注释说明）+ 正文"按 specpipe skill 的 S0→S10"表述改为"按 SpecPipe 规章卷（02/03 路径卷）"；③ explorer bash 白名单中的检索命令（ws/exa/tvly/ctx7）保留为**示例值**，文件头注释声明"检索命令为用户决策位，按实际配置增删"（机制与用户决策分离）；④ checker 白名单采用 `**` 跨段通配形态（本机已修复形态）。其余正文原样迁移 |
| D11 | 测试基架 | bun test；stage 工具测试以 `mkdtemp` 临时目录注入 wfRoot（不触碰真实 `.specpipe/`）；agents 测试用正则/YAML 解析 frontmatter 断言权限结构 |
| D12 | fence | `scripts/run-test-fence.ts` 简化范式（参照 OpenCodeQuota：步骤编排 + `test-fence-reports/fence-*/summary.txt` + SIGINT 处理）：三步 `typecheck → test → smoke`；smoke = `scripts/smoke-plugin.ts`（import 插件入口 → 调用 plugin 函数（stub PluginInput）→ 断言 hooks.tool 含 stage_get/stage_set 且 zod schema 可解析） |

### 时序

块1 合入后建软链/改 opencode.json（D9）；块2/3 完成后 fence 全量 → 手验（验收 3）→ Checker 质量门。全程 B 仓 main 直接迭代（用户拍板模式），无 worktree（纯新增文件，主工作区即干净）。

## 改动点

**块1 —— 骨架 + 数据文件**（先行，其余两块依赖）

1. `package.json`（新建）：D1/D3 全部字段；`scripts: { typecheck, test, fence }`；无 dependencies
2. `tsconfig.json`（新建）：D2 配置；include `src/**` `tests/**` `scripts/**`；exclude `node_modules` `test-fence-reports`
3. `.gitignore`（新建）：`node_modules/`、`test-fence-reports/`
4. `configs/transition-table.json`（新建）：D4/D5/D6 全量内容（21 状态 + 23 边 + 3 建档边 + history 契约段；`source` 记 A 仓 commit hash）
5. `src/core/table.ts`（新建）：数据文件加载（`import table from "../../configs/transition-table.json"`）+ 类型定义 + 两个纯函数 `getLegalSuccessors(state | null): string[]` 与 `isLegalTransition(from | null, to): boolean`（actor 不参与边校验——07 卷职责分工由调用侧约束，见 D7）
6. `src/core/paths.ts`（新建）：`resolveStagePaths(directory, wfRoot, topic)` → `{ stagePath, historyPath, plansDir }`；mkdir plansDir（幂等）
7. `cli/index.ts`（新建）：占位 stub（D1）；`cli/README.md` 更新一行说明（S3 填充）
8. `check-tools/README.md`（已有占位，更新一行：S3 填充；目录无需文件）
9. `scripts/run-test-fence.ts`（新建）：D12 三步编排
10. `scripts/smoke-plugin.ts`（新建）：D12 冒烟
11. `bun.lock`（生成后入库）

**块2 —— stage 插件**（依赖块1）

12. `src/plugin/index.ts`（新建）：插件入口——`export const ocpStagePlugin: Plugin = async (input) => ({ tool: { stage_get, stage_set } })`；两个 tool 用 `@opencode-ai/plugin` 的 `tool()` 定义（description 中文、args zod shape 按 D7）；execute 内走 `src/core/` 纯逻辑；wfRoot 从 `input` 的 options 透传（`PluginOptions`）
13. `src/plugin/stage-ops.ts`（新建）：`getStage(directory, wfRoot, topic)` / `setStage(directory, wfRoot, topic, to, actor)`——读写 `.stage`、append history、错误对象含 `legalSuccessors`
14. `tests/table.test.ts`（新建）：① 每条合法边（23+3）≥1 用例断言 `isLegalTransition` 为 true；② 三路径端到端序列各 1 条（沿链逐态推进）；③ 非法转移代表性枚举：跳级（SPEC_DRAFT→IMPL_APPROVED）、逆行（WORKING→SPEC_DRAFT）、跨路径污染（EPIC_SPEC_DRAFT→SPEC_REVIEWING）、终态无后继（DONE/ALL_DONE → 任意）、from=null 建档仅限 initial 三态
15. `tests/stage-ops.test.ts`（新建）：mkdtemp 注入——get 无文件报错 / set 建档 / set 合法推进 / set 非法（断言错误含合法后继 + `.stage` 与 `.stage-history` 均未变更，验原子性）/ history JSONL 逐字段断言（ts 格式、topic、from、to、actor；建档行 from=null）
16. `tests/smoke 断言已含在 scripts/smoke-plugin.ts`（块1 交付，块2 完成后 fence 才全绿——冒烟属块1 文件但语义依赖块2，编排时 fence 在块2 后跑）

**块3 —— agents 五角色迁移**（与块2 并行，仅依赖块1 的工程基线）

17. `agents/oracle.md`（新建）：v1 迁移 + D10 适配②（模型占位、skill 表述改规章卷引用、文件头对口声明）
18. `agents/explorer.md`（新建）：v1 迁移 + D10 适配③（检索命令示例值声明）
19. `agents/checker.md`（新建）：v1 迁移 + D10 适配④（`**` 通配）
20. `agents/builder.md` / `agents/looker.md`（新建）：v1 原样迁移 + 文件头声明
21. `tests/agents-permission.test.ts`（新建）：解析五文件 frontmatter——断言 ① checker 的 edit 段含 `.specpipe/reviews` 与 `.specpipe/plans` 白名单条目、bash 段 mvn/npm/python 等编译测试命令在位且 `"*": "deny"` 兜底；② explorer 的 edit/write 为 deny、bash 白名单仅只读命令；③ oracle 不含写死的 model 选型（占位形态）；④ 五文件均含对口 A 仓 08 卷的文件头声明
22. `agents/README.md`（更新）：迁移完成说明 + 安装指引（复制到 `~/.config/opencode/agents/` 或项目 `.opencode/agents/`）

各块最小验证：块1 = `bun run typecheck && bun test tests/table.test.ts`；块2 = `bun test tests/stage-ops.test.ts`（+ fence smoke 步）；块3 = `bun test tests/agents-permission.test.ts`。

## 依赖

- `@opencode-ai/plugin@1.18.*`（npm，lockfile 固化）
- A 仓 07-state-machine.md（转移表唯一事实源，数据文件 `source` 记 commit）
- v1 agents 定义（本机 `~/.config/opencode/agents/*.md`，迁移源）
- 本机 opencode 1.18.31（手验宿主）

## 风险

| 风险 | 缓解 |
|---|---|
| D9 本地分发主方案（plugin 数组引路径）行为不确定（文档对本地路径形态语焉不详） | 验收 3 手验先行确认；回退方案（boot 文件 re-export）已备 |
| hook 类型与运行时不一致（上游 #7641） | smoke + 手验双保险，不只信 d.ts |
| 转移边清单从 07 卷推导有缺漏 | 块1 评审重点：数据文件逐条对照 07 卷（验收 5）；S3e 工具化后持续校验 |
| v1 agents 正文含个人化内容（如 explorer 白名单具体命令） | D10 适配规则逐点处理；块3 审查对照 v1 原文 diff |
| 共享态（WORKING 等）跨路径语义未来分化 | 数据文件注释标记共享态；当前与 07 卷等价，不预设计 |
