# 质量门审查报告: specpipe-v2-s2-core (Revision 1)

## 总体评价

通过。

审查对象：B 仓 `opencodepipe` main 分支 4 commits（ee8e998 块1 骨架+转移表 / bf7ef86 块2 stage 插件 / d64d946 块3 agents 迁移 / bb60783 手验记录+状态落定），工作区干净（4 ahead of origin/main）。基准：spec.md + impl.md（rev2，唯一事实源）。七项清单逐项结论见下，质量评分 94/100（3 项 low，无 critical/high/medium）。

## 质量评分

94 / 100

扣分：3 项 low（-2 × 3）。

## fence 结果

- 本审查实际执行：
  - `npm run typecheck`（tsc --noEmit）— **PASS**，exit 0
  - `npm test`（bun test v1.3.14）— **31 用例 / 31 通过 / 0 失败 / 0 跳过 / 359 expect() 调用 / 83ms / 3 文件**
  - `npx bun scripts/smoke-plugin.ts` 单跑 — **PASS**（entry→execute→stage-ops 全链路）
- fence 编排（`scripts/run-test-fence.ts` 三步 + summary 报告）：按调度者流程于本审查 PASS 后统一执行汇合（本报告未代跑编排；其三步的实质内容已由上述单项执行覆盖）。
- E2E：不适用（本仓无 E2E 层；本 Story spec 验收 1 的 fence = typecheck + 单测 + 加载冒烟）。

## 七项逐项结论

### 1. 实现与 impl 一致性 — PASS

改动点 1-22 逐点核对落位与决策（D1-D12）一致：

- **块1**：package.json（name/type/`exports["./plugin"]`/`bin.ocp`/三 scripts/零 dependencies）✓；tsconfig（strict/ESNext/Bundler/`types:["bun"]`/noEmit/verbatimModuleSyntax/**resolveJsonModule**，exclude test-fence-reports）✓；.gitignore 追加 `test-fence-reports/` 且保留既有 5 条 ✓；transition-table.json（18 态/25 边+3 建档/history 契约/notes 三类语义/`source`）✓；equivalence-check.md（28 边+18 态逐行出处）✓；`src/core/table.ts`（数据文件加载+两纯函数，actor 不参与边校验）✓；`src/core/paths.ts`（三路径+mkdir 幂等+topic kebab-case 校验）✓；cli stub + cli/README ✓；plugin/README 指向 `src/plugin/` + 根 README 目录表备注 ✓；fence 脚本三步编排 ✓；bun.lock 入库 ✓
- **块2**：smoke 归块2 ✓；插件入口（单导出/中文 description/zod shape/`options.wfRoot`）✓；stage-ops（get/set/appendFile/`StageOpError.legalSuccessors`/不从入口 re-export）✓；stage-ops.test 六类用例（get 报错/建档/推进/非法+原子性/JSONL/topic 加固）✓
- **块3**：五 agents 迁移 + D10 五点适配（`git diff --no-index` 逐文件对照 v1：builder/looker 仅 +文件头声明；explorer +声明；oracle +声明、model/variant 占位、skill 表述改规章卷；checker +声明、QUALITY_GATE→DONE 调度者加注）✓；agents-permission.test 四组断言 ✓；agents/README 迁移说明+安装指引 ✓
- **聚焦点专项**：
  - **入口单导出（D1 loader 约束）**：`src/plugin/index.ts` 运行时导出仅 `ocpStagePlugin` 一个函数，工具函数在 `stage-ops.ts` 由测试直引、无 re-export ✓
  - **原子语义（D7）**：校验全通过才写 `.stage`；非法转移零写入（测试逐字节断言两文件未变更，冒烟 4c/4d 复核）✓
  - **去重后继（D6）**：`getLegalSuccessors` 经 Set 去重，`ISSUE_IMPL_REVIEWING` 的 REJECT/OVERTURN 双边同目标只列一次 ✓
  - **topic 加固（D7）**：正则 `^[a-z0-9]+(-[a-z0-9]+)*$` 前置拦截（`../escape`/大写/空三类拒绝且零目录副作用）✓
  - **resolveJsonModule（D2）**：已开启，JSON 导入通过 tsc 与 bun 双环境（typecheck/测试实证）✓
  - **依赖四件套（D3）**：plugin `1.18.*`/typescript `5.8.*`/`@types/bun` `1.3.*`/bun `1.3.*`；lockfile 固化 `1.18.31`/`5.8.3`/`1.3.14`/`1.3.14` ✓
- 说明（不计分）：tsconfig include 额外含 `cli/**/*.ts`（impl 未列的超集，属改进）；`check-tools/README.md` 为仓库初始化既有文件（impl 复审已注明），CLI bin 槽位就位；D5/改动点 5 的卷列表未补 05 属复审已决 low 的文档尾项（见第 7 项备注）。

### 2. 代码质量 — PASS

- **类型严谨**：全仓 grep 实证无 `as any`、无显式 `any`、无 `var`、无宽松等值（`==`/`!=`）；JSON 导入单点 `as TransitionTable` 断言，其内容由硬编码期望集双向校验兜底。
- **错误处理**：`StageOpError` 结构化（code + legalSuccessors）；`getStage` 区分 ENOENT 与其它 IO 错误；插件出口将错误转 LLM 可读文本（不抛穿宿主）；smoke 以 try/finally 清理临时目录。
- **命名/注释**：全中文注释；模块头声明职责；时区格式化、O_APPEND/PIPE_BUF 原子边界、单写者假设等关键点均注明原因。
- **死代码**：无；未消费导出（如 `plansDir`）属 impl 契约面（S3 消费预告）。
- OCR 规则注入（ts 版）抽查：无 eval/innerHTML/敏感信息/原型污染/回调地狱；唯一命中 = run-test-fence.ts 链式三元（见问题 3）。

### 3. commit 信息 — PASS

4 个 commit 均中文、以功能为单位、风格与仓库既有（`feat:`/`docs:`）一致：

- `ee8e998 feat: Story 2 块1——工程骨架 + 转移表数据文件 + 转移表测试`
- `bf7ef86 feat: Story 2 块2——stage 插件（stage_get/stage_set 工具 + 原子推进 + history 流水 + 冒烟脚本）`
- `d64d946 feat: Story 2 块3——agents 五角色定义迁移（v1 原样 + D10 五点适配）+ 权限守护测试`
- `bb60783 feat: Story 2 三块编码完成（块1 ee8e998 / 块2 bf7ef86 / 块3 d64d946）+ 验收 3 手验记录——file:// 挂载实证可行，三情形全过`

### 4. 编译验证 — PASS

`npm run typecheck`（tsc --noEmit）exit 0、无错误输出。

### 5. 受影响模块测试 — PASS

`npm test`（bun test）全量三文件：**31 通过 / 0 失败 / 0 跳过 / 359 断言 / 83ms**。分文件：tests/table.test.ts 16、tests/stage-ops.test.ts 7、tests/agents-permission.test.ts 8。插件加载冒烟单跑 PASS（输出：`smoke PASS：stage 插件 entry→execute→stage-ops 全链路`）。

### 6. 测试覆盖与回归 — PASS

验收 2 收敛口径逐项：

- **25+3 边每条 ≥1**：`EXPECTED_EDGES` 28 条循环断言 `isLegalTransition` 放行（含 4 条 OVERTURN 分列边与 3 条建档边）。
- **三路径端到端**：Story 10 态 / Epic 5 态 / Issue 6 态（含共享尾引用）各 1 条链式推进。
- **非法五类**：跳级 / 逆行 / 跨路径污染 / 终态无后继 / 非 initial 建档，全部拒绝（另有未知状态补充用例）。
- **JSONL 逐字段**：字段插入序 ts/topic/from/to/actor、建档行 from=null、ts 为 ISO8601 本地偏移格式（时区无关断言）。
- **原子性**：非法转移后 `.stage` 与 `.stage-history` 逐字节未变更；非法 topic 零目录副作用；建档到非 initial 两文件均未创建。
- **权限结构断言**：checker（edit 白名单限 reviews/plans、bash 编译测试白名单 + deny 兜底、write/apply_patch 硬禁、QUALITY_GATE 加注）、explorer（只读）、builder（全量 allow）、looker（全禁）、oracle（占位形态）五角色全覆盖。
- **自证免疫**：期望状态/边集硬编码自 07/03/04/05 卷（非从数据文件生成），与数据文件双向差集断言（无多边无缺边），另有 trigger 取值域正则。
- **手验记录（验收 3）**：建档/合法推进/非法拒绝三情形 + 原子性复证 + stage_get 复验，留痕与冒烟输出形态互洽。
- **回归**：0 失败，无既有测试破坏。

### 7. 文档归档 — PASS

- `{wf}/plans/specpipe-v2-s2-core/` 四件齐备：spec.md(40) / impl.md(84) / equivalence-check.md(100) / handtest-record.md(35)；`.stage=QUALITY_GATE` 与任务书一致（IMPL_APPROVED→QUALITY_GATE 见 bb60783）。
- **equivalence-check 抽样对照 A 仓卷（A 仓 commit `ec746eac` 实测）**：
  1. 状态 EPIC_SPEC_DRAFT ← 04 L15「.stage → EPIC_SPEC_DRAFT」+ 07 L22 链图 ✓
  2. 状态 ISSUE_IMPL_DRAFT ← 05 L15「.stage → ISSUE_IMPL_DRAFT」+ 07 L34 链图 ✓
  3. 边 IMPL_REVIEWING→SPEC_DRAFT（OVERTURN）← 03 L60 + 07 L56「回退 `SPEC_DRAFT` / `ISSUE_IMPL_DRAFT`」✓
  4. 边 QUALITY_GATE→DONE（actor=调度者）← 07 L39 分工段「终检双 PASS 后 `DONE`」+ L49 转移表 + 03 L75/L84 汇合点 ✓
  5. 建档边 null→SPEC_DRAFT ← 03 L19「.stage → SPEC_DRAFT」✓
  6. 终态 ALL_DONE ← 04 L46-52 终检三校验 + 07 L78 恢复分类 ✓
  （6 条抽样全部命中，无出处错标、无缺漏。）
- 数据文件 `source=ec746eac11c8a1a65d0c1b50a0257a60be4a4d29` 与 A 仓 HEAD 实测一致。
- 备注（不计分）：B 仓根无 AGENTS.md（仓库初始化未建，spec 与任务书均未将其纳入交付面）；impl rev2 复审遗留 low「卷引用补 05」已在 equivalence-check 头部与依赖节落位，impl.md D5/改动点 5 两处文字未同步——属已决 low 的文档尾项，不影响交付物。

## 发现的问题

1. **`zod` 直接导入但未声明依赖** — 严重程度：low
   - 影响：`src/plugin/index.ts` 与 `scripts/smoke-plugin.ts` 均 `import { z } from "zod"`，但 package.json devDependencies 仅四件（plugin/typescript/@types/bun/bun）——zod 仅作为 `@opencode-ai/plugin` 的传递依赖存在于 node_modules（bun.lock 固定 4.1.8，非 hoist 保证）。当前本地 file:// 分发 + bun 扁平 node_modules 下运行正常（typecheck/单测/冒烟/手验全通过）；但属未声明依赖：若改用严格/隔离 linker、或上游 plugin 包调整依赖树，typecheck 与运行时将同时断裂；S4 npm 分发时该导入随包分发，属打包隐患。
   - 建议：改用插件 API 自带的 `tool.schema`（`@opencode-ai/plugin` 已导出 `tool.schema = z`，官方推荐形态），或在 devDependencies 显式声明 `zod`。

2. **get 查询与非法转移的 set 会幂等创建 plans 空目录** — 严重程度：low
   - 影响：`resolveStagePaths()` 先 `mkdir(plansDir, { recursive: true })` 再做后续校验——`stage_get` 对不存在 topic 报错前、非法转移的 `stage_set` 拒绝前，均已在 `{wf}/plans/{topic}/` 铺设空目录。两文件零写入的原子性口径未破坏（测试已实证），但与 D7「零写入」/ 规则 4「校验失败不产生任何写」的严格语义有轻微出入，且查询语义创建目录略反直觉。
   - 建议：可选优化——get 路径改「只解析不铺设」；或维持现状并在 paths.ts 注释显式声明「目录铺设先于校验、幂等无害」的设计取舍。

3. **fence 脚本两处小瑕：收尾汇总路径打印错误 + 链式三元** — 严重程度：low
   - 影响：① `run-test-fence.ts` 收尾 `console.log` 打印的汇总路径为 `join(reports, "summary.txt")`，实际 summary 写入 `join(directory, "summary.txt")`（即 `test-fence-reports/fence-XXXX/summary.txt`）——按日志找报告会被误导（summary 内容含「本轮目录」可兜底）；② 第 101 行三级链式三元命中注入规则 ts 版「禁止嵌套三元」。
   - 建议：① 改为 `join(directory, "summary.txt")`；② 拆为 if/else 或提取映射函数。

## 结论

# PASS

状态：QUALITY_GATE → DONE
