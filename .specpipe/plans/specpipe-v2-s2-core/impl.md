# Impl: Story 2 —— B 仓核心（骨架 + 转移表数据 + stage 插件 + agents）

> rev2（2026-09-17）：吸收 impl 审查 revision-1 全部 15 项问题——OVERTURN 四类分列定稿 25+3 边、工程基线补全（typescript/@types/bun/resolveJsonModule）、QUALITY_GATE→DONE actor 裁决=调度者、D9 分发形态对齐宿主实证（file:// URL）、tests/table 归属块1、计数口径定稿 18 唯一名。

## 技术方案

### 总体策略

单包 `opencodepipe`，TypeScript + Bun（先例：OpenCodeQuota 工程），`src/`（代码）与 `configs/`（数据）与 `agents/`（定义资产）分层；plugin 与未来 check-tools 共经 `src/core/` 消费同一份转移表数据文件。任务切分三块：**块1 骨架+数据文件+转移表测试（串行先行）→ 块2 插件 ∥ 块3 agents 迁移（并行，文件集不相交）**。

### 决策记录

| # | 决策 | 内容与理由 |
|---|---|---|
| D1 | 包结构 | 单包：`name: opencodepipe`、`type: module`；`exports: { "./plugin": "./src/plugin/index.ts" }`（S3 增 `./cli`）。**loader 约束备注（宿主 1.18.31 实证）**：① 插件入口模块**全部运行时导出**被逐个视为插件函数（非函数导出抛 TypeError）——入口仅导出 `ocpStagePlugin` 单个函数，工具函数不从入口 re-export（测试从源文件直引）；② npm 分发形态的入口解析走 `exports["./server"]`→`main`，`"./plugin"` 键不参与——**S4 npm 发布前需调整 exports 键**（立项核查项，本 Story 不涉）。`bin: { "ocp": "./cli/index.ts" }`（槽位占位——文件存在、内容为 `console.error("S3 交付")` + `process.exit(1)`） |
| D2 | 工程基线 | bun + `tsc --noEmit`（typecheck）；tsconfig 参照 OpenCodeQuota 裁剪（去 JSX/`@opentui`），保留 strict / Bundler resolution / `types: ["bun"]` / noEmit / verbatimModuleSyntax；**补 `"resolveJsonModule": true`**（改动点 5 的 JSON 导入在 tsc 侧必需，bun 运行时无碍） |
| D3 | 版本与依赖 | devDependencies 四件：`@opencode-ai/plugin: "1.18.*"`（不用 `@opencode-ai/sdk`——不消费 `PluginInput.client`）+ **`typescript: "5.8.*"` + `@types/bun: "1.3.*"`**（对齐先例版本域；tsc 落地与 `types:["bun"]` 的类型来源必需）+ `bun: "1.3.*"`（锁定运行时版本，对齐先例）；bun.lock 入库。**依赖管理语义**：对齐先例——bun 为运行时/测试引擎，lockfile 双栈可复现 |
| D4 | 转移表 schema | `configs/transition-table.json`：`{ version, source, states[], transitions[], history, notes }`。state：`{ name, path: "epic"|"story"|"issue", initial?: true, blocking?: true, terminal?: true, shared?: true }`（WORKING/QUALITY_GATE/DONE 标 `shared: true`，path=story，Issue 链引用同名态）；transition：`{ from, to, actor: "调度者"|"审查者", trigger }`。trigger 取值集：`建档` / `流程推进` / `{审查类型}审查PASS` / `{审查类型}审查REJECT` / `REJECT:SPEC_OVERTURN` / `用户放行` / `全部Story DONE`。建档边 `from: null`（三初始态各一条，actor=调度者，trigger=`建档`；history 的 from 写 null）。history 段声明 JSONL 字段契约（ts/topic/from/to/actor）。**不进表的三类语义**（notes 段声明）：阻塞语义（blocking 状态属性表达）、S2 重分级与中断恢复（调度者行为规则）、**Issue 升级清理（删除 .stage，非转移边）** |
| D5 | 状态与转移清单（定稿口径） | **状态 18 个唯一名** = Epic 5（含 ALL_DONE，terminal）+ Story 10（含共享 3 态：WORKING/QUALITY_GATE/DONE，shared 标记）+ Issue 专属 3（ISSUE_IMPL_DRAFT/REVIEWING/APPROVED）；按链位计 21（共享态 Issue 链复用）。**转移边 25 条 + 建档 3 条**（OVERTURN 口径：四类审查的 `REJECT:SPEC_OVERTURN` 全部独立成行，与同目标 REJECT 边分列，trigger 区分）：Epic 6（DRAFT→REVIEWING / REVIEWING→USER_AUDIT(PASS) / REVIEWING→DRAFT(REJECT) / **REVIEWING→DRAFT(OVERTURN)** / USER_AUDIT→APPROVED(用户放行) / APPROVED→ALL_DONE(全部Story DONE)）；Story 14（DRAFT→REVIEWING / REVIEWING→USER_AUDIT(PASS) / REVIEWING→DRAFT(REJECT) / **REVIEWING→DRAFT(OVERTURN)** / USER_AUDIT→APPROVED / SPEC_APPROVED→IMPL_DRAFT / IMPL_DRAFT→IMPL_REVIEWING / IMPL_REVIEWING→IMPL_APPROVED(PASS) / IMPL_REVIEWING→IMPL_DRAFT(REJECT) / IMPL_REVIEWING→SPEC_DRAFT(OVERTURN) / IMPL_APPROVED→WORKING / WORKING→QUALITY_GATE / QUALITY_GATE→DONE(PASS) / QUALITY_GATE→WORKING(REJECT)）；Issue 专项 5（ISSUE_IMPL_DRAFT→ISSUE_IMPL_REVIEWING / ISSUE_IMPL_REVIEWING→ISSUE_IMPL_APPROVED(PASS) / ISSUE_IMPL_REVIEWING→ISSUE_IMPL_DRAFT(REJECT) / ISSUE_IMPL_REVIEWING→ISSUE_IMPL_DRAFT(OVERTURN 分列) / ISSUE_IMPL_APPROVED→WORKING）；共享尾 3 边已含于 Story 14（Issue 链引用，不重复声明）。**actor 指派总则**：流程推进/建档/用户放行后落定/终检汇合 → 调度者；审查 PASS/REJECT/OVERTURN → 审查者。**显式裁决：QUALITY_GATE→DONE 的 actor=调度者**（07 卷分工段"终检双 PASS 后 DONE"归调度者，审查者 PASS 是前置之一；07 L49 转移表与 L39 分工段双源，以分工段为准——块3 迁移 checker.md 时同点加注）。精确以 07/03/04 卷逐条核对为准，数据文件 `source` 记 A 仓 commit hash |
| D6 | 三路径共享态 | WORKING / QUALITY_GATE / DONE 为 Story 与 Issue 共享（07 卷两链同名同义）；数据文件单条声明 + `shared: true`，transitions 中 Issue 链引用同名态，边不重复。校验器对共享态不区分路径来源（07 卷未区分，保持等价）；`getLegalSuccessors` 返回**去重**后继清单（同目标多边如 ISSUE_IMPL_REVIEWING→ISSUE_IMPL_DRAFT ×2 只列一次） |
| D7 | stage 工具契约 | `stage_get(args: { topic: string })` → 返回 `{topic, stage}` 或 topic 不存在错误；`stage_set(args: { topic: string, to: string, actor: "调度者"|"审查者" })` → 读当前 `.stage`（无文件视为 from=null）→ 查转移边（from 匹配 + to 匹配；from=null 时 to 必须为 initial）→ 不合法则**返回错误 + 当前状态合法后继清单（去重），零写入** → 合法则写 `.stage`（单行状态名）+ 追加 `.stage-history` JSONL（ts=ISO8601 本地时区偏移格式，与 07 卷示例一致）。zod schema：`args: { topic: z.string(), to: z.string(), actor: z.enum(["调度者","审查者"]) }`。**topic 输入加固**：正则 `^[a-z0-9]+(-[a-z0-9]+)*$`（kebab-case，06-artifacts 取值规则），不匹配拒绝——防路径逃逸。**写者模型**：单写者假设（工作流语义：调度者+审查者经会话串行使用）；`.stage-history` 以 appendFile（O_APPEND）追加，单行 ≤ PIPE_BUF 原子 |
| D8 | {wf} 解析 | 工具内 `wfRoot` 默认 `.specpipe`，基于 `ToolContext.directory` 解析为绝对路径；插件函数**第二参数 options**（PluginOptions）接受 `wfRoot` 覆盖——`opencode.json: "plugin": [["<路径形态>", { "wfRoot": ".specpipe" }]]`（宿主 loader 以配置元组第二元素作插件函数第二参，实证成立）——用户决策位 |
| D9 | 本地分发 | **主方案**：全局 `~/.config/opencode/opencode.json` 的 `plugin` 数组挂 `file://` 绝对 URL 指向 B 仓插件入口（`file:///home/starlex/project/opencodepipe/src/plugin/index.ts`）——OpenCodeQuota 实证先例，单一源免复制；属 spec 规则 6"本地目录方式"范畴（非 npm 分发，意图一致）。**宿主实证备注**：1.18.31 `isPathPluginSpec` 仅识别 `file://` / `.` 开头 / 绝对路径，`~` 形态会被当 npm 包名处理（install 失败）——安装指引一律写绝对路径或 file:// URL。**回退方案**：`~/.config/opencode/plugins/ocp-stage.ts` boot 文件（内容一行：import 入口 + re-export 插件函数——受 D1 loader 约束，仅导出函数）。验收 3 手验确认主方案；不可行则固化回退方案进 README |
| D10 | agents 迁移适配 | 五文件自 `~/.config/opencode/agents/`（v1 现役，476 行）迁入 `agents/`，适配五点：① 文件头注释加对口声明（如 `<!-- 对口 A 仓 08-roles.md「五角色职责矩阵」/「调度协议」 -->`）；② oracle 的 `model`/`variant` 改占位（注释说明用户决策位）+ 正文"按 specpipe skill 的 S0→S10"表述改为"按 SpecPipe 规章卷（02/03 路径卷）"；③ explorer bash 白名单检索命令（ws/exa/tvly/ctx7）保留为**示例值**，文件头注释声明"检索命令为用户决策位，按实际配置增删"；④ checker 白名单 `**` 跨段通配 + **绝对路径条目同样标注示例值**（用户环境值，同 ③ 口径）；⑤ **checker 正文状态转移说明加注**：QUALITY_GATE→DONE 由调度者终检汇合执行（审查者报告 PASS 后），与 D5 裁决一致。其余正文原样迁移 |
| D11 | 测试基架 | bun test；stage 工具测试以 `mkdtemp` 临时目录注入 wfRoot（不触碰真实 `.specpipe/`）；agents 测试解析 frontmatter 断言权限结构 |
| D12 | fence | `scripts/run-test-fence.ts` 简化范式（参照 OpenCodeQuota：步骤编排 + `test-fence-reports/fence-*/summary.txt` + SIGINT 处理）：三步 `typecheck → test → smoke`；smoke = `scripts/smoke-plugin.ts`（import 插件入口 → 以 stub PluginInput + options 调用插件函数 → 断言 hooks.tool 含 stage_get/stage_set、zod schema 可解析且非法 actor 被拒；**顺带以 mkdtemp 调一次 execute 全链路**，覆盖 entry→execute→stage-ops） |

### 时序

块1 合入后按 D9 主方案挂载（file:// URL 进全局 opencode.json，或手验时临时挂载）；块2/3 完成后 fence 全量 → 手验（验收 3）→ Checker 质量门。全程 B 仓 main 直接迭代（用户拍板模式），无 worktree（纯新增文件，主工作区即干净）。

## 改动点

**块1 —— 骨架 + 数据文件 + 转移表测试**（先行，其余两块依赖）

1. `package.json`（新建）：D1/D3 全部字段；`scripts: { typecheck, test, fence }`；无 dependencies
2. `tsconfig.json`（新建）：D2 配置（含 resolveJsonModule）；include `src/**` `tests/**` `scripts/**`；exclude `node_modules` `test-fence-reports`
3. `.gitignore`（**更新**）：**追加** `test-fence-reports/`，保留既有条目（node_modules/、dist/、coverage/、.env、*.log）
4. `configs/transition-table.json`（新建）：D4/D5/D6 全量内容（18 唯一状态 + 25 边 + 3 建档边 + history 契约段 + notes 段；`source` 记 A 仓 commit hash）
5. `.specpipe/plans/specpipe-v2-s2-core/equivalence-check.md`（新建）：**"数据文件 ↔ 07/03/04 卷"逐条对照清单**（28 边逐行 + 状态 18 逐行，标注卷内出处行号）——验收 5 留证基线，供 S3e 工具化比对（沿用 S1 等价底稿命名先例）
6. `src/core/table.ts`（新建）：数据文件加载（`import table from "../../configs/transition-table.json"`）+ 类型定义 + 纯函数 `getLegalSuccessors(state | null): string[]`（去重）与 `isLegalTransition(from | null, to): boolean`（actor 不参与边校验——07 卷职责分工由调用侧约束）
7. `src/core/paths.ts`（新建）：`resolveStagePaths(directory, wfRoot, topic)` → `{ stagePath, historyPath, plansDir }`；mkdir plansDir（幂等）；含 topic kebab-case 校验（D7）
8. `cli/index.ts`（新建）：占位 stub（D1）；`cli/README.md` 更新一行（S3 填充说明）
9. `plugin/README.md`（**更新**）：入口实际位置指向 `src/plugin/`（保持目录规划叙事：本目录为规划占位说明，实现在 src/）；根 README 目录表同步备注
10. `scripts/run-test-fence.ts`（新建）：D12 三步编排
11. `scripts/smoke-plugin.ts`（新建）：D12 冒烟（含 execute 全链路）
12. `tests/table.test.ts`（新建，**归块1**——仅依赖数据文件与 src/core）：① **硬编码期望边集**（从 07/03/04/05 卷人工推导逐条写入测试常量），与数据文件加载结果**双向断言**（数据文件 ⊆ 期望集 = 无多边；期望集 ⊆ 数据文件 = 无缺边）——杜绝以数据文件自证；② 每条合法边（25+3）≥1 用例断言 `isLegalTransition`；③ 三路径端到端序列各 1 条（沿链逐态推进）；④ 非法转移代表性枚举：跳级（SPEC_DRAFT→IMPL_APPROVED）、逆行（WORKING→SPEC_DRAFT）、跨路径污染（EPIC_SPEC_DRAFT→SPEC_REVIEWING）、终态无后继（DONE/ALL_DONE→任意）、from=null 建档仅限 initial 三态；⑤ 去重语义（Issue REVIEWING 双边同目标，successors 只列一次）
13. `bun.lock`（生成后入库）

**块2 —— stage 插件**（依赖块1）

14. `src/plugin/index.ts`（新建）：插件入口——`export const ocpStagePlugin: Plugin = async (input, options) => ({ tool: { stage_get, stage_set } })`；**入口仅此一个导出**（D1 loader 约束）；两个 tool 用 `@opencode-ai/plugin` 的 `tool()` 定义（description 中文、args zod shape 按 D7）；execute 走 `src/core/` 与 `stage-ops`；wfRoot 取自第二参数 `options`（D8）
15. `src/plugin/stage-ops.ts`（新建）：`getStage(directory, wfRoot, topic)` / `setStage(directory, wfRoot, topic, to, actor)`——读写 `.stage`、append history（appendFile/O_APPEND）、错误对象含去重 `legalSuccessors`；**不从入口 re-export**（测试直引本文件）
16. `tests/stage-ops.test.ts`（新建）：mkdtemp 注入——get 无文件报错 / set 建档 / set 合法推进 / set 非法（断言错误含合法后继 + `.stage` 与 `.stage-history` 均未变更，验原子性）/ history JSONL 逐字段断言（ts 格式、topic、from、to、actor；建档行 from=null）/ topic 非法格式拒绝（`../escape`、大写、空）

**块3 —— agents 五角色迁移**（与块2 并行，仅依赖块1 的工程基线）

17. `agents/oracle.md`（新建）：v1 迁移 + D10 适配②（模型占位、skill 表述改规章卷引用、文件头对口声明）
18. `agents/explorer.md`（新建）：v1 迁移 + D10 适配③（检索命令示例值声明）
19. `agents/checker.md`（新建）：v1 迁移 + D10 适配④（`**` 通配 + 绝对路径条目示例值声明）+ 适配⑤（QUALITY_GATE→DONE 调度者执行加注）
20. `agents/builder.md` / `agents/looker.md`（新建）：v1 原样迁移 + 文件头声明
21. `tests/agents-permission.test.ts`（新建）：解析五文件 frontmatter——断言 ① checker 的 edit 段含 `.specpipe/reviews` 与 `.specpipe/plans` 白名单条目、bash 段 mvn/npm/python 等编译测试命令在位且 `"*": "deny"` 兜底；② explorer 的 edit/write 为 deny、bash 白名单仅只读命令；③ oracle 不含写死的 model 选型（占位形态）；④ 五文件均含对口 A 仓 08 卷的文件头声明
22. `agents/README.md`（更新）：迁移完成说明 + 安装指引（复制到 `~/.config/opencode/agents/` 或项目 `.opencode/agents/`；含 D9 的 loader 备注链接）

各块最小验证：块1 = `bun install && bun run typecheck && bun test tests/table.test.ts`；块2 = `bun test tests/stage-ops.test.ts`（+ `bun run scripts/smoke-plugin.ts`）；块3 = `bun test tests/agents-permission.test.ts`。

## 依赖

- `@opencode-ai/plugin@1.18.*` + `typescript@5.8.*` + `@types/bun@1.3.*` + `bun@1.3.*`（npm，bun.lock 固化）
- A 仓 07-state-machine.md + 03/04 路径卷（转移表唯一事实源与 OVERTURN 边出处，数据文件 `source` 记 commit）
- v1 agents 定义（本机 `~/.config/opencode/agents/*.md`，迁移源）
- 本机 opencode 1.18.31（手验宿主；插件加载行为实证：`isPathPluginSpec` 识别 file:///./绝对路径、全运行时导出即插件）

## 风险

| 风险 | 缓解 |
|---|---|
| D9 主方案 file:// URL 挂载的宿主行为差异（先例为 tui.json 场景） | 验收 3 手验先行；回退方案（boot 文件）已备且受 D1 约束设计 |
| hook 类型与运行时不一致（上游 #7641） | smoke（含 execute 全链路）+ 手验双保险 |
| 转移边清单缺漏 | 双保险：equivalence-check.md 人工逐条对照（改动点 5）+ 测试硬编码期望边集双向断言（改动点 12①，自证免疫）；S3e 工具化后持续校验 |
| v1 agents 正文含个人化内容 | D10 适配规则逐点处理（含 checker 绝对路径白名单示例值化）；块3 审查对照 v1 原文 diff |
| JSON 导入 bun/tsc 双环境差异 | D2 resolveJsonModule 显式开启；typecheck 与 bun test 双步均在 fence |
| `.stage-history` 并发追加 | D7 单写者假设声明 + O_APPEND 原子性边界备注（工作流语义下单调度者串行） |
| 共享态跨路径语义未来分化 | 数据文件 `shared` 标记 + notes 声明；当前与 07 卷等价，不预设计 |
