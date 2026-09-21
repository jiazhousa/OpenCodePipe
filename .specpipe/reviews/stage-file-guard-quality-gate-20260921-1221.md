# 质量门审查报告: stage-file-guard (Revision 1)

- **审查类型**：质量门全面审查（I-S7，Issue 路径；第 7 项「文档归档与 AGENTS.md」按口径跳过）
- **审查对象**：B 仓 `opencodepipe` commit `29ba9e2`（main 分支，单 commit；5 文件 +105/-5；工作树干净，HEAD=main）
- **基准材料**：`issue-impl.md`（rev2 APPROVED）+ rev1/rev2 审查报告（`reviews/stage-file-guard-issue-impl-review-20260921-1209/1213.md`）+ SI-001（`~/doc/SpecIssue.md`）+ A 仓 07-state-machine.md + B 仓源码/测试/配置（read/grep/只读 git 取证）
- **状态校验**：`.stage` 实读 `QUALITY_GATE`（与任务书一致）；`.stage-history` 7 行完整（建档 → REVIEWING → rev1 REJECT 回落 → 重申 → APPROVED → WORKING → QUALITY_GATE）
- **审查时间**：2026-09-21
- **审查限制**：shell 白名单受限（同 rev1/rev2）；未复跑测试——`bun test`（139）与 `bun run typecheck` 由调度者执行全绿（任务书声明），本审查以静态取证复核用例断言质量；fence（四步）由调度者于双 PASS 后执行

## 总体评价

**通过（PASS）**。改动与 issue-impl 逐点一致（含 rev2 复审约定：两处新增落位、测试边界）；错误码语义、消息文案（实际值+修复指引）、零写入语义保持、`errorOutput` 消费兼容均核实成立；新增 5 条用例逐条真锁行为（可红性论证见第 6 项）；commit 单条、中文、与 diff 一致；部署位 oracle.md 与 B 仓同款两处新增、各自本地化差异保留。2 项 low（注释口径 1 处、消息边缘场景 1 处），不阻断。

## 质量评分

96 / 100

（2 项 low，各 -2；无 critical/high/medium）

## fence 结果

- 单元测试：**139 用例，139 通过，0 失败**（调度者实跑 `bun test`，任务书声明；本审查未复跑——静态清点顶层 `test()` 声明 123 处 + 2 组 `test.each` 生成 16 例（4+12，`tests/cli-doctor-worktree.test.ts:337/347`）= 139 口径相容；`tests/stage-ops.test.ts` 顶层 test() 7→12，与 +5 用例一致）
- E2E 测试：不适用（本仓无 E2E 层；fence 四步 = typecheck / test / smoke / consistency，`scripts/run-test-fence.ts:18-24`）
- 合计：139 用例，139 通过，0 失败（调度者证据）+ typecheck 绿
- fence（四步全量）：**由调度者于双 PASS 后执行，结论于汇合点核实**；本报告为审查判定结论（typecheck/test 两项已在调度者侧先行全绿）

## 七项逐项结论

### 1. 实现与 issue-impl 一致性 — PASS

| issue-impl 改动点 | 实现锚点（read/grep 取证） | 判定 |
|---|---|---|
| table.ts 新增 isKnownState/initialStateNames（消费 states，不硬编码） | `src/core/table.ts:52-63`（Set 消费 `transitionTable.states`）；initial 恰 3 态（`configs/transition-table.json:5,10,20`） | ✅ |
| StageOpErrorCode 扩展 STAGE_INVALID | `src/plugin/stage-ops.ts:11`（union 加性扩展；构造签名不变 `:18-24`） | ✅ |
| getStage：非空且未知名 → STAGE_INVALID（直写识别） | `stage-ops.ts:75-85`（空文件 STAGE_NOT_FOUND 在先 `:76-78`；消息含实际值+疑似直写+修正/建档两条修复路径） | ✅ |
| setStage：非法 from / 非法 to 前置校验，先于 isLegalTransition，零写入不变 | `stage-ops.ts:117-128` 先于 `:129`（转移校验）与 `:136-140`（写入区）；`resolveStagePaths` ensure=false（`src/core/paths.ts:32,39-41`） | ✅ |
| index.ts 双描述补建档语义/直写识别（V1/V2 同源常量） | `src/plugin/index.ts:21-24` 常量；V1 引用 `:120,:133`、V2 引用 `:71,:90` | ✅ |
| oracle.md 两处新增（部署位 + B 仓源，非补句） | 部署版 `~/.config/opencode/agents/oracle.md:58,85`；B 仓 `agents/oracle.md:58,85`（各 +2 行，逐字同款） | ✅ |
| 测试 5 条（三场景 + 零写入 + 空文件边界 + 两条 to 路径分列） | `tests/stage-ops.test.ts:174-236`（5 条，`test()` 声明 7→12） | ✅ |

- rev2 复审约定核对：① 两处新增落位（「可调用工具」表新增行 + 「铁律」新增第 7 条）在两文件均落实；② 测试边界（空 `.stage` 边界回归、`from=null` 与 `from=合法态` 两条 to 非法路径分列断言、消息内容断言）已兑现。
- 中性化口径（rev2 观察 2）：B 仓 frontmatter 占位（`agents/oracle.md:4-5`「用户决策位」）与 L30 / L63-65 中性化措辞保留，未回填部署版本地化内容；守护测试 `tests/agents-permission.test.ts:120-128` 所辖形态未触碰。

### 2. 代码质量 — PASS（含 2 low，见问题节）

- **table.ts（+13）**：Set 模块加载期构建一次、纯函数无副作用；`initial` 以严格 `=== true` 判等；注释中文、事实性。low#1 见问题节。
- **stage-ops.ts（+23/-2）**：全部新校验前置于写入区；错误码语义区分「状态名非法 ≠ 转移非法」；getStage 消息含实际值（I-S3）+ 疑似直写 + 两条修复路径；setStage from 非法附建档目标、to 非法附三初始态（from 合法再附当前合法后继）；`legalSuccessors` 仅在 TRANSITION_ILLEGAL 携带（STAGE_INVALID 不携带，避免与 `errorOutput` 追加语义混淆，测试 `:189` 锁定）。low#2 见问题节。
- **index.ts（+2/-2）**：仅两描述常量字符串；`errorOutput`（`:27-36`）零改动兼容（`instanceof` + legalSuccessors 非空守卫）；全仓 grep 无 `StageOpErrorCode` 穷举 switch（消费点唯一）。
- **tests/stage-ops.test.ts（+65/-1）**：夹具 `directWriteStage` 模拟 shell 直写（含尾换行，贴近真实文件形态）；断言以 `toContain` 为主，抗文案微调而不弱化行为锁定。
- **agents/oracle.md（+2）**：工具表行与铁律第 7 条，行文含建档语义与 Issue 升级删除例外。

### 3. commit 信息 — PASS

- 单 commit `29ba9e2`：`fix: stage 状态名合法性校验补强——直写产物识别与建档语义显性化（SI-001）`——`<type>: <描述>` + CJK，符合 `configs/commit-format.json`（types 含 fix）；正文 5 条与 numstat 文件清单一致（agents/oracle.md +2 / table.ts +13 / index.ts +2-2 / stage-ops.ts +23-2 / tests +65-1）；`git show --check` 无空白错误；无越界文件。

### 4. 编译验证 — PASS（调度者证据）

- `bun run typecheck`（tsc --noEmit）由调度者执行 exit 0；本审查未复跑（shell 白名单不含 bun，任务书约定）。

### 5. 受影响模块测试 — PASS（见 fence 节）

- 新增用例组 + 存量回归（stage-ops 12 条、table 16 条、agents-permission 8 条等）随 `bun test` 139 全绿（调度者实跑）。

### 6. 测试覆盖与回归 — PASS

新增 5 条逐条可红性（防形式主义复核——若对应实现被移除/顺序颠倒/零写入破坏，用例必红）：

| 用例 | 断言要点 | 可红性论证 |
|---|---|---|
| get 直写 I-S3（`:182-190`） | code=STAGE_INVALID、消息含实际值与「直写」、legalSuccessors 未定义 | 回退静默返回 → capture 得 undefined 即红；抛 TRANSITION_ILLEGAL / STAGE_NOT_FOUND → code 断言红；误附后继 → 末条断言红 |
| 空 `.stage` 边界（`:192-197`） | code=STAGE_NOT_FOUND | 误判为非法状态名 → code 断言红 |
| set 非法 from（`:199-209`） | code=STAGE_INVALID、消息含 I-S3 与建档目标、.stage 逐字节原样、history 未创建 | 移除 from 校验 → 落到 TRANSITION_ILLEGAL 红；校验顺序颠倒同理红；写入破坏 → 字节比较 / expectMissing 红 |
| set 非法 to，from=null（`:211-221`） | code=STAGE_INVALID、消息含 I-S4 与三初始态、.stage 与 history 均未创建 | 移除 to 校验 → TRANSITION_ILLEGAL 红；`initialStateNames` 未消费 → 三态断言红；目录/文件副作用 → expectMissing 红 |
| set 非法 to，from=合法态（`:223-235`） | code=STAGE_INVALID、消息含 S-S6 与 SPEC_REVIEWING、两文件逐字节未变更 | 同上；追加 history 会改变字节 → 红 |

- 回归面：存量 stage-ops 7 条（合法建档/推进/get 复验/跳级拒/history 契约/topic 加固）语义未变（新校验仅对未知名生效）；`hook-core`（`cli/commands/hook-core.ts:84-98,148-168`）文本判定 `.stage === DONE` 并匹配 history 行（不读状态常量集，不受影响）；check-tools 全系不读 `.stage`；`table.test.ts:105-128` 持续守护 states 数据（含 initial 三态），新函数消费面有回归保护。

### 7. 文档归档与 AGENTS.md — 跳过（Issue 路径）

- Issue 级不归档 spec/impl 至代码仓（本 topic 文档在 `~/doc/.specpipe/plans|reviews/`）；B 仓 AGENTS.md 本项不计。

## 部署位同步核对

- 部署版 `~/.config/opencode/agents/oracle.md:58`（工具表新增行）与 `:85`（铁律第 7 条）同 B 仓 `agents/oracle.md:58,85` **逐字一致**；frontmatter / 本地化差异（部署版 model/variant 实值、模型举例；B 仓占位与中性化）各自保留——符合任务书「各自保留自身 frontmatter/本地化差异」预期。

## 发现的问题

1. **table.ts 注释「错误提示与工具描述共用」与事实不符** — 严重程度：low
   - 锚点：`src/core/table.ts:60`（initialStateNames 注释）；`src/plugin/index.ts:15`（未 import 该函数）、`:24`（`STAGE_SET_DESC` 以字面量内嵌三初始态名）
   - 影响：工具描述未消费该函数（实际仅 stage-ops 两条错误消息使用，`stage-ops.ts:120,126`），「初始态清单」存在双源；若未来转移表 initial 变动，描述字面量静默漂移——与该函数注释「禁止消费方硬编码」的意图相悖（仅文案/维护面，无运行时影响）
   - 建议：二选一——(a) `STAGE_SET_DESC` 改为模板字符串消费 `initialStateNames()`（推荐，根除漂移）；(b) 维持字面量则修正注释为「错误提示使用；工具描述同清单需同步维护」

2. **setStage 的 to 非法分支：from 为终态时消息尾部空悬** — 严重程度：low
   - 锚点：`src/plugin/stage-ops.ts:123-128`（`getLegalSuccessors(from).join("、")` 拼接无空值守卫）；终态无后继实证 `tests/table.test.ts:202-203`（DONE / ALL_DONE 后继为 []）；对照 `index.ts:30-32`（errorOutput 对 legalSuccessors 有非空守卫）
   - 影响：`.stage`=DONE / ALL_DONE 且 `to` 非法时，消息渲染为「……；当前合法后继：」空尾（无有害行为，仅提示文案边缘残缺；该场景在正常流程罕见）
   - 建议：拼接以非空为条件（后继列表为空时省略该段），并可补一条 from=终态的消息回归断言；顺带（可选打磨，impl 明文规定故不计分）：from 合法分支消息首段「未建档时合法建档目标」对已建档场景为冗余信息

## 备查（不计分）

1. **QG→DONE 落定 actor 口径**：`agents/checker.md:174` 注与 `configs/transition-table.json` notes「actor指派」均载明 `QUALITY_GATE→DONE` 归调度者；本流程近期实践（`.specpipe/plans/*/.stage-history` 近 8 例中 7 例，含同日先例）为审查者按任务书落定。本次已按任务书执行（actor=审查者）；如需回归 checker.md 口径，建议调度者统一后续约定（hook 校验不读 actor 字段，`cli/commands/hook-core.ts:84-98`，无功能影响）。
2. **SI-001 记录状态**：`~/doc/SpecIssue.md` 该条状态仍为「待讨论」——闭环标记由调度者/用户按流程收尾，不属本次代码改动范围。
3. 本审查受 shell 白名单限制未复跑测试/fence（rev1/rev2 同款）；结论均为只读取证 + 调度者实跑证据交叉核对。

## 状态落定说明

- 依任务书指令执行落定：`.stage` 实读 `QUALITY_GATE` 一致 → `stage_set(topic=stage-file-guard, to=DONE, actor=审查者)`（本报告 PASS 为审查判定结论；fence 由调度者于汇合点核证——若 fence 异常，请调度者按规定处置并同步状态）。
- 审计链：本报告 + `issue-impl.md`（rev2）+ 两份 issue-impl 审查报告 + `.stage-history`。

## 结论

# PASS

状态：QUALITY_GATE → DONE
