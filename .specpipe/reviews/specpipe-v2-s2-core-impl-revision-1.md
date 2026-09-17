# 审查报告: specpipe-v2-s2-core — Impl (Revision 1)

## 总体评价

**不通过（REJECT，非 SPEC_OVERTURN）**。

impl 的三块切分、D1~D12 决策记录与风险表整体扎实：spec 四部件与验收 1~5 均有对应、无镀金；三块文件集经逐文件核对不相交；D7 的 stage 工具契约与 D12 冒烟设计经 `@opencode-ai/plugin` 1.18.30 类型定义核对基本成立。但存在 2 项 high：

1. **工程基线按字面实现无法通过 fence 第一步 typecheck**——D3 的 devDependencies「仅 @opencode-ai/plugin」缺 `typescript`/`@types/bun`，D2 的 tsconfig 清单缺 `resolveJsonModule`（改动点 5 以 JSON 导入消费数据文件）；
2. **转移边清单的 SPEC_OVERTURN 口径不完整且与自身「同目标分列」规则不一致**——A 仓 03 L37 / 04 L33 均定义 spec 级 `REJECT: SPEC_OVERTURN` 的 .stage 回退边，D5 未列；而 Issue 的同目标 OVERTURN 却已分列，边总数 23 是两种口径的混合。

另有 4 项 medium（计数标注、QUALITY_GATE→DONE 的 actor 未裁决、D9 与 spec 规则 6 的机制偏差及 `~/` 形态不成立、块1 最小验证引用块2 文件）与 9 项 low，建议一并修订后重新递交。

**审查材料**：impl.md（80 行）、spec.md（40 行）、A 仓 07-state-machine.md / 08-roles.md / 03-story-path.md / 04-epic-path.md / 05-issue-path.md / 06-artifacts.md、epic-spec.md（90 行）、spec 审查报告 rev1、本机 v1 agents 五件（80+172+79+83+62=476 行逐文件核对）、OpenCodeQuota 先例（package.json / tsconfig.json / scripts/run-test-fence.ts / scripts/smoke.ts / AGENTS.md / bunfig.toml）、`@opencode-ai/plugin` 1.18.30 类型定义（index.d.ts / tool.d.ts）、opencode 1.18.31 插件加载源码（`packages/opencode/src/plugin/shared.ts` / `loader.ts`，dev 分支 version=1.18.31 与宿主一致）与官方插件文档、B 仓现状实测（仓根条目 / README / .gitignore / 各占位目录 / git 历史）、A 仓 HEAD=`ec746ea`（07 最后变更 `1134414`）。

## 质量评分

**38 / 100**（2 high × -12 + 4 medium × -5 + 9 low × -2 = -62）

## 逐项结论

### 1. 范围对齐 — 通过（1 处偏差）

- 四部件全覆盖：2a→改动点 1-3/7-11（含 cli 与 check-tools 的 bin 槽位与目录骨架，spec 规则 8 明示）；2b→4-6；2c→12-15；2d→17-22。无镀金：无 CLI 逻辑（stub 占位）、未建 CI、无 npm 发布、无检索脚本内置、未碰 Task.yaml。
- 验收 1~5 均有落点：1→D12 三步 fence；2→改动点 14/15/21；3→D9+时序节；4→改动点 17-22+测试 21；5→风险表（留证形式见问题 11）。
- spec 审查 rev1 遗留吸收：medium（权限生效单测）→改动点 21 结构断言；low 状态数→D5「含 ALL_DONE」（但 21/18 计数口径见问题 3）；low 建档边/阻塞语义→D4；low CI→上游档案已修订（无 impl 义务）。
- 偏差：D9 主方案与 spec 规则 6「本地目录方式（复制或软链至 `~/.config/opencode/plugins/`）」不符（问题 5）。

### 2. 契约一致性（重点） — 不通过（1 high + 1 medium）

- **逐条核对通过部分**：21 个链位状态全部对应 07 三链（Epic 5 含 ALL_DONE / Story 10 / Issue 6 链位 = 18 个唯一名 + 3 共享态重复计）；23 条枚举边与 07 状态链 + 审查者转移表逐条命中（Epic 5、Story 链 13、Issue 专项 5），**无多报**；建档边 3 条（三初始态、actor=调度者、from=null）与 07「DRAFT 创建 / 中断恢复无 .stage」一致；共享态声明、`path` 标 story、Issue 链引用同名态与 D6 一致；D4 history 字段（ts/topic/from/to/actor）与 07 L11 JSONL 示例逐字段一致（含建档行 from=null、ts 为 ISO8601 本地时区偏移、actor ∈ {调度者, 审查者}）。
- **high（问题 2）**：`SPEC_OVERTURN` 口径不完整——03 L37（Spec 审查）/ 04 L33（Epic Spec 审查）的 OVERTURN 回退边缺失；与 Issue「同目标边分列」的自身规则不一致。
- **medium（问题 4）**：D5 未逐条指派 actor（D4 schema 要求该字段）；其余边可由 07 分工段推得，唯 `QUALITY_GATE→DONE` 在 07 内为双源表述（L49 表 vs L39 分工段），须裁决。

### 3. 技术方案可行性 — 不通过（工程基线不可执行）

- **类型核对通过**：`tool()` 签名与 D7 用法一致（tool.d.ts L47-59，`execute(args, context)` + zod raw shape）；`Plugin` = `(input: PluginInput, options?: PluginOptions) => Promise<Hooks>`、`Hooks.tool = { [key: string]: ToolDefinition }`（index.d.ts L36-51、L179-181），与 D7/D12 用法一致；`configs/transition-table.json` 同包 import 消费（bun 运行时）成立。
- **D8 PluginOptions 透传机制真实形态成立**：`Config.plugin?: Array<string | [string, PluginOptions]>`（index.d.ts L48-50）支持元组形态；loader 以 `server(input, load.options)` 将配置项第二个元素作插件函数第二参传入（1.18.31 `loader.ts`/`shared.ts`）——`options.wfRoot` 覆盖可行；但改动点 12 措辞「wfRoot 从 `input` 的 options 透传」不精确（options 为第二参数，非 input 字段），建议顺带改精确。
- **D12 冒烟可执行**：import 入口（bun 直跑 TS）→ stub PluginInput 调用 → 断言 `hooks.tool` 含双工具并解析 zod schema，均成立。
- **high（问题 1）**：devDependencies 与 tsconfig 按字面无法过 typecheck。
- **medium（问题 5）**：D9 本地加载形态与宿主 1.18.31 实际行为存在偏差（`~/` 不识别；目录形态入口解析走 `exports["./server"]`→`main`，D1 的 `"./plugin"` 键不参与）。
- 备注（不列入问题）：先例 OpenCodeQuota 实际以 npm 管理依赖（package-lock.json + `npm run typecheck`），bun 仅作运行时/测试，且其本地分发用 `file://` URL 挂 plugin 数组（tui.json）；D3 选择 bun.lock 双栈打通可行，建议补一句锁定方式理由或与先例对齐语义。

### 4. 任务切分有效性 — 基本通过（1 处验证失配）

- 三块文件集逐文件核对**互不相交**：块1 {package.json、tsconfig.json、.gitignore、configs/transition-table.json、src/core/table.ts、src/core/paths.ts、cli/index.ts、cli/README.md、check-tools/README.md、scripts/run-test-fence.ts、scripts/smoke-plugin.ts、bun.lock}；块2 {src/plugin/index.ts、src/plugin/stage-ops.ts、tests/table.test.ts、tests/stage-ops.test.ts}；块3 {agents/oracle.md、explorer.md、checker.md、builder.md、looker.md、tests/agents-permission.test.ts、agents/README.md}。
- 块间依赖声明正确：块2/块3 → 块1；改动点 16 对 smoke「块1 文件、块2 语义、fence 在块2 后跑」的编排说明正确。
- **medium（问题 6）**：块1 最小验证命令引用块2 交付物 `tests/table.test.ts`，块1 无法自验。

### 5. 测试覆盖完备性 — 基本通过（1 项建议）

- 验收 2 收敛口径覆盖映射齐全：每条合法边≥1（14①）、三路径端到端各 1 条（14②）、非法代表性枚举五类（14③：跳级 / 逆行 / 跨路径 / 终态 / from=null 非 initial）、JSONL 逐字段 + 原子性（15：非法时 `.stage` 与 `.stage-history` 均不变更）、权限结构断言（21：checker edit 白名单 + bash deny 兜底、explorer 只读、oracle 模型占位、五文件头声明）。
- 弱覆盖路径（可接受，不单列问题）：tool execute 全链路（entry→execute→stage-ops）无单测，靠验收 3 手验兜底——建议 smoke 顺带以 mkdtemp 调一次 execute（可选）；`options.wfRoot` 覆盖路径无单测（验收 3 覆盖）；非法 actor 的 zod 拒绝可由 smoke「schema 可解析」顺带断言。
- 测试基架（mkdtemp 注入、不触碰真实 `.specpipe/`）设计正确。
- **low（问题 12）**：14① 若以数据文件自身为输入存在自证风险（缺边不被拦截）。

### 6. 风险识别充分性 — 基本通过（3 项建议补充）

- 风险表 5 项与 spec 关键风险对应完整（D9 分发 / hook 类型漂移 / 边缺漏 / v1 正文个人化 / 共享态分化），缓解可执行。
- 建议补充：JSON 导入的 bun/tsc 双环境差异（已升级为问题 1 的修复项）、`.stage-history` 并发追加语义（问题 13）、宿主 loader 的「全运行时导出即插件」约束（问题 9）。

## 发现的问题

1. **工程基线按字面实现无法通过 typecheck：devDependencies 不完整 + tsconfig 缺 resolveJsonModule** — 严重程度：**high**
   - 影响：D3 规定 devDependencies 仅 `@opencode-ai/plugin`，但验证链要求 `tsc --noEmit`（D2）且 tsconfig 走 `"types": ["bun"]`：① 无 `typescript` 则 `tsc` 不落地（若依赖 bun auto-install 属非声明、不可复现、不锁版本）；② 无 `@types/bun` 则 `types:["bun"]` 必然 TS2688、`bun:test` 导入无类型来源；③ 改动点 5 以 `import table from "../../configs/transition-table.json"` 消费数据文件，D2 的 tsconfig 清单无 `resolveJsonModule`——tsc 对 JSON 导入必然 TS2732（bun 运行时无碍，卡点恰在 typecheck）。后果：`bun run typecheck`（fence 第一步 + 各块最小验证）按 impl 字面直接失败，验收 1 失守。先例 OpenCodeQuota 的 package.json 实含 `typescript 5.8.2 / @types/bun 1.3.13 / bun 1.3.14`，与 D3 表述相悖。
   - 建议：devDependencies 补 `typescript`、`@types/bun`（对齐先例版本域），重新生成 bun.lock；D2 显式补 `"resolveJsonModule": true`（并确认默认导入形态在目标 tsc 版本下成立）。

2. **SPEC_OVERTURN 边口径不完整且与自身「同目标分列」规则不一致** — 严重程度：**high**
   - 影响：A 仓 03 L37 定义 Spec 审查 `REJECT: SPEC_OVERTURN → .stage 回退 SPEC_DRAFT`、04 L33 定义 Epic Spec 审查 `REJECT: SPEC_OVERTURN → .stage 回退 EPIC_SPEC_DRAFT`（均为明确 .stage 边）；epic 规则 2 亦将「SPEC_OVERTURN 回退边」列入数据文件契约。D5 仅含 Impl 级（Story `IMPL_REVIEWING→SPEC_DRAFT`）与 Issue 级（已注明「与 REJECT 同目标边分列」）。按「同目标分列」口径应补 2 条（Epic 6 / Story 14 / Issue 5 = **25 边**）；按「同目标合并」口径则 Issue 应合并（**22 边**）。当前 23 为两种口径的混合，导致：数据文件与 03/04 的对账缺口、验收 2「含 …OVERTURN 回退」覆盖不完整、S3e 一致性校验与 S4 审计无从解释差异。
   - 建议：统一口径并同步改动点 4/5/14 与测试计数：推荐「四类审查的 `REJECT: SPEC_OVERTURN` 全部独立成行」（Epic +1、Story Spec +1 → 25+3，trigger 标 `REJECT: SPEC_OVERTURN`）；或走合并口径（Issue 合并为 22+3）并在 D5 写明裁决理由。

3. **D5 计数标注与自身枚举、共享态声明不一致** — 严重程度：**medium**
   - 影响：① Story 标「12」但枚举 13 条；② Issue 标「6」但其专项仅 5 条（含共享共 8 项）；③「状态 21 个」按链位重复计了 3 个共享态，而 D6 明确共享态单条声明（`state.path` 标 story、Issue 链引用同名态）——`states[]` 实际为 **18 个唯一状态名**。计数是 Builder 与测试断言（「23+3」）的唯一锚点，口径误读将直接造成行数与断言错位。
   - 建议：改为「Story 链 13 条（含共享尾 3 条）/ Issue 专项 5 条」（若采 25 版则相应为 14/6/5）；状态表述改「18 个唯一名 = Epic 5 + Story 10 + Issue 专属 3（共享 3 态单条声明；按链位计 21）」。另建议顺手明确 `getLegalSuccessors` 对同目标双边（Issue REVIEWING→DRAFT ×2）的去重语义，避免错误提示出现重复项。

4. **QUALITY_GATE→DONE 的 actor 未裁决（07 内部双源）** — 严重程度：**medium**
   - 影响：D4 schema 要求每条边带 actor，D5 全篇未逐条指派。其余边可由 07 分工段与转移表推得，唯质量门 PASS 行存在双源：07 L49 转移表（审查者 PASS→DONE）vs 07 L39 分工段（「终检双 PASS 后 DONE」归调度者，另见 07 L61 / 03 L75 的 fence 汇合语义）。取值不定将影响：数据文件记录、块3 迁移的 checker.md（保留 v1「质量门 PASS→DONE」表）与之同构性、S4 的 pre-push/审计解释。
   - 建议：D5 补 actor 映射总则并在该行显式裁决——结合双 PASS 语义建议 actor=调度者（审查者 PASS 为前置之一）；若取审查者则说明与 07 L39 的关系；同步检查块3 checker.md 是否需加注。

5. **D9 主/回退与 spec 规则 6 不符；「`~/` 展开」形态不成立** — 严重程度：**medium**
   - 影响：spec 规则 6 明确「本 Story 采用本地目录方式（复制或软链至 `~/.config/opencode/plugins/`）完成自举验证」，D9 将其降为回退且未记录理由；且「`~/` 展开」不成立——opencode 1.18.31 插件加载源码 `isPathPluginSpec` 仅识别 `file://` / `.` 开头 / 绝对路径，`~` 会被按 npm 包名处理（install 失败）。另：目录形态 spec 的入口解析走 `exports["./server"]`→`main`→根 index（D1 的 `"./plugin"` 键不被消费），文件形态（绝对路径或 file URL）才直接可用——先例 OpenCodeQuota 即以 `file://` URL 挂 plugin 数组。
   - 建议：将 plugins 目录（symlink 保持单一源）升为主方案（或补 D9 理由并确认 spec 修订）；手验指引统一写「绝对路径或 file:// URL」；把上述加载器事实附入手验/README。

6. **块1 最小验证引用块2 交付物** — 严重程度：**medium**
   - 影响：L63「块1 = `bun run typecheck && bun test tests/table.test.ts`」，但 `tests/table.test.ts` 是改动点 14、列于块2；块1 完成时该文件不存在，验证命令不可执行，且块2 的最小验证又不含它。该测试仅依赖块1 的 `src/core/table.ts` + 数据文件，归属回块1 更自洽。
   - 建议：将改动点 14 移入块1（块1 验证保持 typecheck + table 测试），或改块1 验证为 `bun run typecheck`。

7. **改动点 3 `.gitignore` 标注「新建」与事实不符** — 严重程度：**low**
   - 影响：B 仓根 `.gitignore` 已存在（5 行：node_modules/、dist/、coverage/、.env、*.log），实际动作应为「更新——追加 `test-fence-reports/`」；按「新建」字面处理有覆盖丢条目（.env 等）风险。
   - 建议：改为「更新（追加 test-fence-reports/，保留既有条目）」。

8. **D1 的 `src/plugin` 结构与既有 `plugin/` 目录/根 README 目录表未同步** — 严重程度：**low**
   - 影响：根 README「目录规划」表与 `plugin/README.md` 均声明 `plugin/` = 状态机插件（Story 2 交付）；实际入口落 `src/plugin/index.ts`，落地后两处文档失真。
   - 建议：更新 `plugin/README.md`（指向 src/plugin 或说明结构）并同步根 README 表备注。

9. **插件入口/分发的两条 loader 实证注意** — 严重程度：**low**
   - 影响：① opencode 1.18.31 loader 将模块**全部运行时导出**逐个视为插件函数（非函数导出抛 TypeError，仅日志可见）——入口模块应仅导出 `ocpStagePlugin`，`stage-ops` 工具函数勿从入口 re-export（测试从源文件直引）；② npm 分发（S4）入口解析走 `exports["./server"]` 或 `main`，D1 的 `"./plugin"` 键不参与——本地 file 形态不受影响，S4 前需调整。
   - 建议：写入 D1/D12 实现备注或 S4 立项核查项。

10. **checker 迁移保留作者本机绝对路径白名单** — 严重程度：**low**
    - 影响：现 checker.md frontmatter 含 `/home/starlex/project/**/.specpipe/...` 绝对路径；D10 四点适配未覆盖该类「用户环境值」（epic 规则 9：目录名等具体值属用户决策），分发资产携带作者家目录存在个人信息与可移植性问题。
    - 建议：按 explorer 检索命令同款处理——文件头声明为示例值/按环境调整。

11. **验收 5 留证形式未定** — 严重程度：**low**
    - 影响：spec 审查建议「定留证形式（diff 清单存档供 S3e 基线）」；impl 仅风险表「块1 评审重点…（验收 5）」一句，无对照清单的落盘位置与责任方，S3e 工具化缺少比对基线。
    - 建议：块1 完成时产出「数据文件 ↔ 07 卷」逐条对照清单（26/28 行）存档于本 topic 档案。

12. **测试 14① 建议以硬编码期望边集断言** — 严重程度：**low**
    - 影响：「每条合法边（23+3）≥1 用例」若以数据文件自身为输入循环，属自证——数据缺边不会被测试拦下，与风险表第 3 项（转移边缺漏）的自动化缓解相矛盾。
    - 建议：测试内置从 07/03/04/05 推导的期望边集（逐条硬编码），双向断言「无缺无边」（与问题 2/3 的定稿计数同步）。

13. **`.stage-history` 并发追加语义未说明** — 严重程度：**low**
    - 影响：读 .stage→校验→写 .stage→追行 的序列非跨进程原子；并发 stage_set（多会话）可能乱序或丢行。当前单调度者+单审查者使用下风险低，但作为「强制层」契约宜显式。
    - 建议：声明单写者假设（工作流语义）或说明 appendFile 的 O_APPEND 原子性边界。

14. **topic 未做路径边界校验** — 严重程度：**low**
    - 影响：stage_set 以 `{wf}/plans/{topic}/` 落盘，topic 无格式校验（`../` 可逃逸 plans 目录）；06-artifacts 规定 topic 为 kebab-case。
    - 建议：最小加固（topic 正则或路径包含性校验），或明示信任边界。

15. **Issue 升级清理语义未与 S2 重分级并列声明** — 严重程度：**low**
    - 影响：spec 规则 3/epic 规则 2 将「Issue 升级清理语义」列入数据文件契约；05 L52-56 的「清理 .stage 文件」非状态转移。D4 只声明了「阻塞语义 / S2 重分级 / 中断恢复」，未带升级清理。
    - 建议：在 D4 同句补「升级清理（删除 .stage，非转移边，不进表）」。

## 结论

# REJECT

状态：IMPL_REVIEWING → IMPL_DRAFT

> 复审建议：问题 1/2 为必改项；问题 3/4/5/6 建议一并修订；问题 7~15 可随改。联动提醒：问题 2（OVERTURN 口径）与问题 3（边数/状态数）需一次定稿（含测试计数「23+3」→「25+3」或「22+3」）；问题 4 若裁决 actor=调度者，需同步检查块3 迁移的 checker.md 状态转移表加注；问题 5 修订 D9 时建议同时更新时序节（L28「建软链/改 opencode.json」）的表述，保证主方案与手验指引一致。
