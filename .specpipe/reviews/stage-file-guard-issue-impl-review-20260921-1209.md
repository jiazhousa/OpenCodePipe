# 审查报告: stage-file-guard (Revision 1)

- **审查类型**：Issue Impl 文档审查（I-S5，完整但精简；含现状代码逐点核对）
- **审查对象**：`.specpipe/plans/stage-file-guard/issue-impl.md`（52 行）
- **基准材料**：SI-001 记录（`~/doc/SpecIssue.md`）；A 仓 07-state-machine.md / 05-issue-path.md / 09-check-split.md；B 仓 `~/project/opencodepipe` 源码与配置（全部以 read/grep 取证，锚点见 file:line）
- **审查前状态**：`ISSUE_IMPL_REVIEWING`（已读 `.stage` 校验一致；`.stage-history` 建档/推进两行完整）
- **审查限制**：文档审查阶段未执行 `bun test` / `bun run typecheck`（验证方案按可执行性与覆盖面评估，命令均核实存在）；shell 通道受限，代码事实均以 read/grep 取证

## 总体评价

**不通过**（1 项必改 + 3 项低档建议）。方案主体成立：三层缺口（查询不设防 / 报错语义混淆 / 建档能力不可见）与 SI-001 根因逐条对应，无过度设计；代码侧 4 项改动点（table.ts / stage-ops.ts / index.ts / tests）与现状代码逐点核实匹配、可落地；兼容性与回归面论断经全仓 grep 验证成立。**唯一阻断点**：改动点 #4（规章文档落位）锚点与现状不符——部署版与 B 仓 `agents/oracle.md` 的「可调用工具」表均无 `stage_set` 行（全文件无任何 stage 工具字样），且「技术方案=表行补句」与「改动点=铁律补句」两处落位表述互不一致，按字面不可执行，需修订后复审。

## 6 项清单核验

1. **术语一致性 — 通过**：`isKnownState` / `initialStateNames` / `STAGE_INVALID` / `successorIndex` / `legalSuccessors` 等术语与 B 仓代码实体一一对应；`from=null` / 建档边 / 初始态表述与转移表数据文件语义一致。
2. **范围对齐 — 通过**：三层缺口与 SI-001 根因逐条对应，无遗漏、无越界（未动转移表数据文件、未动 hook/check 通道）。改动面 = 代码 3 + 测试 1 + 规章 2；「≤3 文件」口径以「测试为同逻辑单元伴生、规章为层 2 配套」自辩成立（参照既有 Issue 先例，不构成越界）。
3. **改动点核查 — 部分通过（判不通过）**：5 项改动点 4 项核实通过（见事实表），`oracle.md` 落位 1 项锚点失实（问题 1）。
4. **隐藏依赖 — 通过**：新函数仅消费既有 `transitionTable.states`（`StateDef.initial` 字段已存在，table.ts:6-17）；无新增第三方依赖、无未声明外部系统。
5. **风险与兜底 — 通过**：`StageOpErrorCode` 为加性 union 扩展（stage-ops.ts:11），`errorOutput`（index.ts:27-36）为唯一消费点（全仓 grep 无穷举 switch）；`legalSuccessors` 可选语义不变；新校验全部置于写入区（mkdir/writeFile/appendFile，stage-ops.ts:116-119）之前，零写入语义保持（resolveStagePaths 走 ensure=false，stage-ops.ts:97-98）。
6. **回归面 — 通过**：hook-core.ts:148-168 以文本比对 `.stage==="DONE"`，不消费 table/stage-ops 状态集；check-tools 五项均不读 `.stage`；存量测试均用已知状态名断言 `TRANSITION_ILLEGAL`（tests/stage-ops.test.ts:132、:147；tests/table.test.ts:216-220），不受新增校验影响；`bun run fence`（四步 typecheck→test→smoke→consistency，scripts/run-test-fence.ts:18-24）与所附单测命令均可执行。

## 核实通过的关键事实

| 计划断言 | 取证锚点（read/grep） | 结论 |
|---|---|---|
| table.ts 新增 isKnownState/initialStateNames（消费 states，不硬编码） | `src/core/table.ts:6-17`（StateDef.initial?: boolean）、`:33-39`（transitionTable 导出、states: StateDef[]）；`configs/transition-table.json:5,10,20` 三 initial | 可落地 |
| StageOpErrorCode 扩展 "STAGE_INVALID" | `src/plugin/stage-ops.ts:11`（三值 union）、`:14-24`（构造签名不变：code + message + legalSuccessors?） | 兼容（加性） |
| getStage 前置「非空且未知名」校验 | `stage-ops.ts:63-80`（空文件 → STAGE_NOT_FOUND :77；非空 trim 返回 :79） | 插入点明确、空文件语义保持 |
| setStage 前置校验先于 isLegalTransition、零写入不变 | `stage-ops.ts:108-114`（边校验）先于 `:116-119`（写入区） | 成立 |
| 「I-S3 不在 successorIndex 键集 → 后继空数组」 | `table.ts:41-56`（Map 由 transitions 构建；未命中返回 []） | 与现状一致 |
| STAGE_GET_DESC/STAGE_SET_DESC 双薄层同源常量 | `index.ts:21-24` 常量；V1 `:120,:133` 与 V2 `:71,:90` 同源引用 | 一致 |
| errorOutput 零改动兼容 | `index.ts:27-36`（仅 instanceof + legalSuccessors）；全仓 grep：StageOpError 消费点仅此 + 测试 | 成立 |
| hook-core / check-tools 不受影响 | `cli/commands/hook-core.ts:148-168`（文本 `.stage==="DONE"`）；cli/ 下 `.stage` 引用仅 hook 两文件命中 | 成立（表述可收窄，见问题 3） |
| 验证命令与 fence 可执行 | `package.json:13/14/15`（typecheck/test/fence）；`tests/stage-ops.test.ts`、`tests/table.test.ts` 存在；`scripts/run-test-fence.ts:18-24` | 可执行 |
| 文档规约 | `issue-impl.md` 52 行 ≤80；模板必填节（问题/根因/方案/改动点/影响/验证/风险）齐备 | 合规 |
| oracle.md 落位 | 部署版 `~/.config/opencode/agents/oracle.md:49-57`（表 5 行）、`:76-83`（铁律 6 条）；B 仓 `agents/oracle.md:49-57`、`:76-83`；grep `stage_set`/`stage_get` 两文件零命中 | **锚点失实（问题 1）** |

## 发现的问题

### 1. 改动点 #4 编辑锚点失实（两处 oracle.md 均无 `stage_set` 行）+ 计划内部两处落位表述不一致 — 严重程度：medium（必改）

- **行级锚点**：`issue-impl.md:24`（技术方案：「可调用工具」表 `stage_set` 行补句）；`issue-impl.md:32`（改动点：「铁律补句」）
- **事实**：部署版与 B 仓 `agents/oracle.md` 的「可调用工具」表均仅 5 行（`task` / `read`·`grep`·`glob`·`list` / `edit`·`write` / `bash` / `question`，两文件 L49-57），全文件 grep 无 `stage_get`/`stage_set` 字样（v1 备份同）；铁律节为 6 条（L76-83）。「表 `stage_set` 行补句」的落位不存在；且与改动点「铁律补句」指向不同位置，执行者无法按字面执行、落点将即兴化。
- **影响**：① 按字面执行会落空，需执行者自行推断为「新增」；② 计划失去唯一事实源精度，两处表述冲突使落点不确定；③ 若被理解成「跳过」，层 2 文档防呆静默缺失（当前仅靠工具描述层兜底，非计划本意）；④ 质量门「实现与 impl 一致性」环节将出现「impl 说补句到既有行 vs 实际新增行」的表述性对照噪声。
- **建议**（择一并写明；推荐 a+b 并做）：
  - a. 「可调用工具」表**新增** `stage_get` / `stage_set` 行，行文含「`stage_set` 含建档（未建档时 `to` 限三初始态 `EPIC_SPEC_DRAFT` / `SPEC_DRAFT` / `ISSUE_IMPL_DRAFT`）」；
  - b. 铁律**新增一条**：「`.stage` 状态操作一律经 `stage_set`（含建档）；禁止 shell 直写（Issue 升级清理 `.stage` 属删除文件，不受限）」；
  - c. 写明两文件同步口径与顺序（建议：先改 B 仓源 → 与部署版 diff 对齐后回填，保留部署版本地化行——风险节已有此意，建议上移为改动点正文）。

### 2. 测试用例组的边界建议 — 严重程度：low（建议，可随修订一并处理）

- **行级锚点**：`issue-impl.md:31`（用例组：get 直写识别 / set 非法 from / set 非法 to / 零写入断言）
- **影响**：STAGE_INVALID 三场景、零写入、存量回归已覆盖（满足任务口径）；两条边界未显式：① 空 `.stage` 文件仍报 `STAGE_NOT_FOUND`（新分支紧邻，防误伤回归）；② `from=null`（建档写错常量）与 `from` 合法（推进写错常量）两条 `to` 非法路径分列，并断言提示内容（三初始态清单 / `legalSuccessors`），以确保 `initialStateNames` 真被消费。
- **建议**：用例组补 2~3 条断言。

### 3. 影响范围表述可收窄 — 严重程度：low

- **行级锚点**：`issue-impl.md:40`（「hook-core.ts / check-tools 不消费 isKnownState（其 .stage===DONE 检查语义独立）」）
- **事实**：读 `.stage` 判 `===DONE` 的只有 hook-core；check-tools 五项（whitespace / line-budget / commit-format / transition-consistency / platform-words）均不读 `.stage`。
- **建议**：改为「hook-core（`.stage` 文本判定 `===DONE`）与 check-tools（不读 `.stage`）均不受影响」。

### 4. STAGE_INVALID 消息建议含实际值与修复指引 — 严重程度：low（编码注意）

- **行级锚点**：`issue-impl.md:19`（getStage 消息：疑似直写 + 合法常量出处）
- **建议**：消息附「实际读到的内容」与「修复指引（`.stage` 路径；修正后重试 / 清理后经 `stage_set` 建档）」，与 setStage 侧口径对齐——SI-001 场景复演时无需再进 shell 查文件。

## 风险备查（不计分）

- **部署版 / B 仓 oracle.md 差异**：部署版含本地化行（model/variant 实值、「~/project/specpipe/」表述），B 仓为占位源；编辑时按计划风险节先 diff 再动，勿覆盖本地化。
- **B 仓 agents 守护测试**：`tests/agents-permission.test.ts:120-128` 守护 B 仓 oracle.md 的 model/variant 占位与「用户决策位」关键词；本次只应动正文（表/铁律），勿碰 frontmatter。
- **备查（不扩围）**：部署版 / B 仓 `checker.md` 的 `.stage` 更新仍以 `edit` 白名单直写为文档口径，与「统一优先走 `stage_set`」的长期方向属同类残留面；插件侧检测（本方案 getStage/setStage 校验）已可兜底识别非法值，建议在编码时或后续 Issue 记录收口计划。
- **B 仓通道细节**：`agents/**` 在 pre-push 白名单（「命中即代码」）与 whitespace 检查覆盖内；新增表格行注意无尾随空格（可选跑 `ocp check whitespace`）。B 仓为「直接 main 迭代」（2026-09-17 拍板），与 05 卷 worktree 口径的差异属该仓既定约定，不影响本审查。

## 结论

**# REJECT**

**必改项清单（1 项）**：
1. 修订改动点 #4 / 技术方案 #4——按问题 1 建议明确「新增」落点（表新增 stage 工具行 与/或 铁律新增条），消除两处表述冲突，写明两文件同步口径。

**建议项（3 项，可随修订一并处理）**：问题 2（测试边界）、问题 3（表述收窄）、问题 4（错误消息含实际值 + 修复指引）。

状态：`ISSUE_IMPL_REVIEWING` → `ISSUE_IMPL_DRAFT`

复查口径：单点修订后 rev2 仅需核对问题 1 落位与问题 2 用例补充；代码侧 4 项改动点、兼容性与回归面结论已全量核实，不受修订影响。
