# Issue Impl: stage 状态名合法性校验补强（直写产物识别 + 建档语义显性化）

## 问题/需求描述

SI-001（~/doc/SpecIssue.md）：topic 建档时 `.stage` 被 shell 直写为非法状态名 `I-S3`（阶段编号误作状态常量），后续 `stage_set` 推进被拒。调查证实三层缺口：① `stage_get` 查询通道完全不校验状态名，直写产物原样返回不告警；② `stage_set` 对非法 `from`/`to` 笼统报「非法转移」+ 空后继清单，误导排障方向（状态名非法 ≠ 转移非法）；③ 工具描述未披露建档语义（转移表本有 3 条 `from: null` 建档边），调度者不知可用 `stage_set` 建档而退回 shell 直写。

## 根因分析

- 校验只存在于 `stage_set` 调用路径（`isLegalTransition`），`.stage` 是裸文本文件，shell 直写零阻力落盘——文件系统层无法阻止，须靠「查询/推进时识别直写产物 + 工具路径显性化」补强
- `I-S3` 不在 `successorIndex` 键集 → `getLegalSuccessors` 返回空数组 → 报错形态为「非法转移 + 空后继」，而真实语义是「状态名非法」，错误分类缺失

## 技术方案

1. `src/core/table.ts` 新增两个纯函数导出（消费 `transitionTable.states`，不硬编码）：
   - `isKnownState(name): boolean` — 状态名 ∈ 常量表集合
   - `initialStateNames(): string[]` — 三初始态（建档边唯一合法目标），错误信息用
2. `src/plugin/stage-ops.ts`：
   - `StageOpErrorCode` 扩展 `"STAGE_INVALID"`
   - `getStage`：非空内容且 `!isKnownState(stage)` → 抛 `STAGE_INVALID`，message 指明「疑似绕过 stage_set 直写」+ 合法常量出处
   - `setStage` 前置校验：`from` 非 null 且 `!isKnownState(from)` → `STAGE_INVALID`（提示修正 .stage 或清理后经 stage_set 建档）；`!isKnownState(to)` → `STAGE_INVALID`（附三初始态清单，from 合法时附 legalSuccessors）；两者均先于 `isLegalTransition` 执行，零写入语义不变
3. `src/plugin/index.ts` 工具描述（`STAGE_GET_DESC`/`STAGE_SET_DESC` 双薄层同源常量）：
   - SET 补「未建档（无 .stage）时为建档操作：to 限三初始态 EPIC_SPEC_DRAFT/SPEC_DRAFT/ISSUE_IMPL_DRAFT」
   - GET 补「内容不在状态常量表时报非法状态（直写产物识别）」
4. 规章铁律（层 2，两处新增而非补句——现状「可调用工具」表无 stage 工具行，工具由插件注入）：
   - 部署版 `~/.config/opencode/agents/oracle.md`（生效位）：「可调用工具」表**新增一行** `stage_get` / `stage_set`（注明：含建档——未建档时 to 限三初始态）；「铁律」节**新增一条**：`.stage` 写入一律经 `stage_set`（含建档），禁止 shell 直写（Issue 升级清理 .stage 属删除文件，不受限）
   - B 仓 `agents/oracle.md`（源，内容落后部署版）：编码时先对齐部署版全文，再施加同款两处新增，保持源与生效位一致

## 改动点

- `src/core/table.ts`：新增 `isKnownState`/`initialStateNames` 导出（约 +10 行）
- `src/plugin/stage-ops.ts`：`STAGE_INVALID` 错误码 + `getStage`/`setStage` 状态名校验；message 一律附实际值与修复指引（如「当前状态名非法：I-S3（不在状态常量表，疑似直写产物）——请修正 .stage 为合法常量或清理后经 stage_set 建档」）（约 +25 行）
- `src/plugin/index.ts`：两描述常量补建档与校验语义（约 ±4 行）
- `tests/stage-ops.test.ts`：新增 STAGE_INVALID 用例组（约 +60 行）：get 直写识别 / set 非法 from / set 非法 to（from=null 与 from=合法态两条路径分列断言）/ 零写入断言（含 .stage-history 不追加）/ 边界回归（空 .stage 文件仍 STAGE_NOT_FOUND）
- `~/.config/opencode/agents/oracle.md` + `agents/oracle.md`（B 仓）：工具表新增 stage 行 + 铁律新增第 7 条（文档，非代码；B 仓保持中性化源形态不回填部署版本地化内容）

> 代码 3 文件 + 测试 1 文件，Issue 范围内（测试为同逻辑单元伴生）；规章文档 2 处为层 2 配套。

## 影响范围

- 消费方兼容：`StageOpErrorCode` 为 union 类型扩展（新增值），`errorOutput`（index.ts）走既有 `StageOpError instanceof` 分支零改动即兼容；`legalSuccessors` 字段可选语义不变
- 行为变更面：仅「非法状态名」场景从 `TRANSITION_ILLEGAL`/静默原样返回 变为 `STAGE_INVALID`——存量合法流程（建档/推进/查询合法态）零影响
- 影响面收窄说明：hook-core 读 `.stage` 但仅做 `=== "DONE"` 文本判定，独立于状态常量集；check-tools 全系不读 `.stage`——两者均不受影响

## 验证方式

- `cd ~/project/opencodepipe && bun test tests/stage-ops.test.ts tests/table.test.ts`（新增用例 + 存量回归）
- `bun run typecheck`
- fence：`bun run fence`（全量，质量门阶段执行）
- 手验：临时目录直写非法状态名 → `stage_get` 报 STAGE_INVALID（编码后以测试用例覆盖代替，不污染真实 .specpipe）

## 风险

- 错误码新增对潜在外部消费方的穷举 switch：B 仓内 grep 无此形态（errorOutput 为唯一消费点），风险可忽略
- B 仓 `agents/oracle.md` 落后部署版：编码时先 diff 对齐再补句，防覆盖部署版 9-20 演进内容
