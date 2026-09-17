# 审查报告: specpipe-v2-s3-cli — Impl (Revision 1)

## 总体评价

**不通过（REJECT，非 SPEC_OVERTURN）**。

impl 的 18 项决策与四块切分整体扎实：spec rev2 十条业务规则、七条验收标准均有落点；spec 审查遗留的 1 medium（白名单优先级）与 1 low（history 缺失补 WARN）均已吸收；五项 check-tools 与 09 卷机械项清单逐一对齐；D6→D8→D13→D18 的 vendored 闭环经 A 仓现状实测可闭合（A 仓 HEAD=`ec746eac11c8a1a65d0c1b50a0257a60be4a4d29` == transition-table.json `source`；`07-state-machine.md` 与 templates 九件在场且命名吻合；S2 交付的 tests/table.test.ts 含 18 态 + 28 边硬编码常量，机械提取可行）。

但存在 **4 项 medium + 12 项 low**，建议修订后重新递交（REJECT 非推倒 spec——spec 与桩数据无冲突）：

1. **D11 行数上限与 06-artifacts 双向偏差**——40/30 报告上限未落实（弱化）；自创 `reviews/**≤120` 兜底反而对 06 无上限类（impl/质量门报告）产生误报，B 仓现存 `specpipe-v2-s1-rules-impl-revision-1.md`（144 行）与 `specpipe-v2-s2-core-impl-revision-1.md`（130 行）两份**合法**报告将直接 FAIL。
2. **D5 history 增强校验实现口径未钉死**——"核含 `"to":"DONE"`" 字面暗示子串匹配，而 07 卷契约示例为**空格形态**（`"to": "SPEC_USER_AUDIT"`）；S2 插件写紧凑形态——两形态并存，字面实现会误拒空格形态的合法留痕。
3. **D8 对账提醒的触发判据无机械定义**——"07 卷哈希变了而边集未适配"的"未适配"不可机判（快照对账只在 B 侧内部自洽）；照字面实现则 spec 规则 5 要求的"契约已变"报警可能永不触发。
4. **D15 输入载体未定义**——检索三通道"用户配置声明"的介质、本地 A 仓路径来源均未指定，doctor 无法确定性实现（README/BOOTSTRAP 也只写"用户配置声明"未给载体）。

**审查材料**：impl.md（101 行）/ spec.md（55 行）/ spec 审查报告 rev1+rev2 / A 仓 06-artifacts、09-check-split、10-composition 卷与 07-state-machine.md 逐条核对 / A 仓 HEAD 与 templates 九件实测 / B 仓现状（cli/、configs/、check-tools/ 目录实测；scripts/run-test-fence.ts 139 行；.gitignore 6 行；四 topic .stage；reviews 目录 14 份报告行数实测）/ transition-table.json + tests/table.test.ts / S1 impl 禁词表 / 根 README + docs/BOOTSTRAP.md。

## 质量评分

**56 / 100**（4 medium × -5 + 12 low × -2 = -44）

## 逐项结论

### 1. 范围对齐 — 通过

业务规则逐条映射：

| spec 业务规则 | impl 落点 | 判定 |
|---|---|---|
| 1 pre-push 语义（白名单/Epic 跳过/history 增强/③ WARN/前提） | D3 + D4 + D5 | ✓（"文档明示"落点见 问题 #12） |
| 2 转移表三层（副本/hash/快照） | D6 + D7 + D13 | ✓（D13① 范围见 问题 #10） |
| 3 一致性校验进 fence + doctor 报告 | D18 + D15 | ✓ |
| 4 CLI 零依赖手写 | D1 | ✓（可执行形态见 问题 #7） |
| 5 vendor-sync 内嵌对账提醒 | D8 | △（判据见 问题 #3） |
| 6 hook 安装 + B 仓自举 | D2 + D16（--hook） | ✓（自举产物见 问题 #12） |
| 7 ocp init 铺设物 | D16 | ✓ |
| 8 ocp doctor 检查项 | D15 | △（载体见 问题 #4） |
| 9 ocp worktree | D17 | ✓（基准分支见 问题 #13） |
| 10 check-tools 五项 + Task.yaml 模块位 | D9–D14 | △（D11 见 问题 #1） |

验收标准 1–7 映射：1→D18 四步；2→改动点 9（含幂等断言）；3→D15 + 改动点 10；4→D17 + 改动点 10；5→时序 + 改动点 33（调度者留证，impl 已明示非 Builder 交付）；6→改动点 24 + 32；7→D7 + D13③ + 改动点 32。**无遗漏项**。镀金检查：D6 templates 逐件哈希、D13② schema 自校验为小幅增益（服务于篡改检测与引用完整性），未见越界（未碰 S4 发布/user-rule、未实现 Task.yaml 七项、未内置检索 CLI、未建 CI）。

### 2. 契约一致性 — 不通过（1 medium + 3 low）

- **D4/D5 与 spec 规则 1 逐句对应 ✓**：白名单命中即代码（吸收 spec 审查 medium，`agents/**` 与 `configs/vendor/**` 的 .md 以白名单为准）；Epic 判定=目录含 `epic-spec.md`（明示）；② `.stage===DONE` + history 存在才核行（增强）；③ 无 topic WARN 放行；拒绝输出原因+指引（含 `--no-verify`）。history 缺失放行补 WARN 一行（吸收 spec rev2 低建议）✓。
- **09 卷机械项口径**：whitespace ✓（D10，尾随空白+EOF 换行）、commit-format ✓（D12，`<type>: <中文描述>` + CJK，与现仓 git log 风格一致）、transition-consistency ✓（D13）、platform-words ✓（D14，承接 banned-words 场景）。编译/测试执行由既有 fence 承载 ✓。
- **06 卷行数上限**：spec.md≤300 / epic-spec≤500 / issue-impl≤80 三档与 06 终稿口径一致 ✓；报告档双向偏差 → **问题 #1**。
- **10 卷分支格式**：D17 正则 `^(dev|rel|ms)/(feat|fix|chore)/[a-z0-9-]+$` 与 spec 规则 9 示例（`dev/feat/xxx`）及用户三级命名惯例一致 ✓；A 卷表格 dev 行「分支前缀」列写 `feat/*` 与标题「三级格式」存在表述张力——备查项，见 问题 #13（不构成 impl 问题）。
- **white-noise 细节**：D5 正则硬编码 `.specpipe/plans/` 而 D4 提供 archivePrefix 配置（问题 #11）；history 校验口径（问题 #2）。

### 3. 技术方案可行性 — 部分不通过（2 medium + 4 low）

- **D2 薄壳双形态可行**（生成时探测 + shell exec；hook 走 stdin refs 与 git 原生 diff）✓；但生成物细节未钉死（问题 #7）。
- **D3 stdin 解析与降级可行**（新分支全零 sha → `local_sha~1` + WARN）；奇异形态兜底缺一句"diff 失败不阻断"（问题 #8）。
- **D5 纯函数设计可行**：`输入 diff 文件清单 + 仓库根` 的实际读文件（.stage/.stage-history/epic-spec.md）可由 mkdtemp fixture 驱动测试，与 S2"不触碰真实 .specpipe/"纪律兼容 ✓。
- **D6–D8–D13–D18 闭环可行**：A 仓在场且 HEAD == source（首跑 --path 直接成立）；vendored 产物入库 → D13 三层校验 → D18 fence 挂载链路完整；D8 的"对账提醒"判据需补（问题 #3）。
- **D7 提取可操作**：`EXPECTED_STATES`（18）与 `EXPECTED_EDGES`（28=25+3）为对象字面量，可正则/AST 提取或搬运后 diff 核对；快照元素形态与比较身份建议显式钉死（问题 #5）。
- **改动点核查（对仓实测）**：`cli/index.ts`（stub 在场，重写 ✓）；`cli/commands/` **尚不存在**（改动点 2/3/4 标"重写"不实，问题 #6）；`scripts/run-test-fence.ts`（在场 ✓）；`configs/transition-table.json`（在场 ✓，新增 vendor 段不破坏 table.test.ts 的 source/边数断言，回归无碍）；`scripts/vendor-sync.ts`、`check-tools/*.ts`、`configs/vendor/**`、`configs/transition-snapshot.json` 均不存在（"新建"口径正确 ✓）。
- **D15 可行但接口悬空**（问题 #4）。
- **D17 可行**：校验函数单测（不真建 worktree）；创建语义建议补（问题 #13）。
- **D18 可行**：现有 fence 的 steps 数组天然支持追加；入口命令与退出码需钉死（问题 #14）。

### 4. 任务切分有效性 — 通过（2 low）

- 四块文件集逐文件核对：**B/C/D 三块互不相交**；A 与 B/C 对 `cli/commands/hook.ts`、`cli/commands/check.ts` 为**显式顺序交接**（A 建五个命令文件 stub，B/C 各自重写其一）——所有权声明自洽，不构成并行冲突 ✓。
- 块D 改 `transition-table.json` / `run-test-fence.ts` / `check-tools/transition-consistency.ts`，其他块不碰 ✓；`tests/*.test.ts` 四分文件互不相交 ✓。
- 依赖顺序正确：A 先行（路由+stub）→ B（依赖 A 路由）∥ C（依赖 A 路由）∥ D（不依赖路由）✓。
- 跨块导入边（C 的 check.ts → D 的 transition-consistency.ts；D 的 fence → C 的 check 路由）为运行时收敛依赖，非文件冲突；建议在任务书标注"块D 收尾后才可全量 fence"（见 问题 #14）。
- 问题 #6（标注与笔误）不影响切分实质。

### 5. 测试覆盖完备性 — 基本通过（1 medium + 2 low）

- 验收 2（改动点 9：目录/模板/fence 模板/gitignore 幂等 + hook 生成物）/ 验收 4（改动点 10 正反）/ 验收 6（改动点 24 + 32 五项各 ≥1 正反）/ 验收 7（改动点 32③ 双向对账）覆盖到位 ✓；验收 5 由调度者真机三情形 + `hooktest-record.md` 留证（改动点 33）✓。
- hook-core 六用例覆盖 spec 规则 1 五种正常分支 + 白名单优先级 ✓；**缺两个判别性用例**：history 存在但无 `QUALITY_GATE→DONE` 行 → 拒；history 空格形态（07 示例）→ 放行（问题 #2）。
- 测试前提与可测性两处待补（问题 #15）。

### 6. 风险识别充分性 — 基本通过（3 low）

- 风险表 6 项与 spec 关键风险对应完整（stdin 边界 / hook 失效 / 白名单争议 / 首跑哈希 / 词表误报 / fence 时长），缓解可执行 ✓。
- 补漏：hook 生成物运行时形态（问题 #7）、diff 奇异形态的 fail-open 口径（问题 #8）、`--tag` 模式的网络失败与 A 仓 URL 来源（问题 #16）。
- 任务书点名场景研判：bare 仓不运行 hooks（无需处理）；子模块各自独立（无需处理）；**worktree 场景（`.git` 为文件、`core.hooksPath` 自定义）建议 init 用 `git rev-parse --git-path hooks` 解析**（问题 #12 内）。

### 附：术语一致性 / 隐藏依赖 / 回归面

- 术语：与 spec 对齐（vendored / transition-consistency / topic / DONE / {wf} / fence）；两处笔误（问题 #6）。
- 隐藏依赖：A 仓本地路径（已声明）、git ≥2.x（已声明）、S2 交付物（已核对在场）、无新增 npm 依赖（声明与实现路线一致）；`--tag` 模式隐含网络依赖（问题 #16）。
- 回归面：`run-test-fence.ts` 仅追加第四步（既有三步语义不变）✓；`transition-table.json` 增 vendor 段不影响 table.test.ts 断言 ✓；hook 自举安装对 B 仓后续推送的影响符合 spec 规则 6 语义（DONE 后推）✓。

## 发现的问题

### Medium

1. **D11 line-budget 与 06-artifacts 上限双向偏差** — 严重程度：**medium**
   - 影响：① 06 对 Epic Spec 报告 ≤40 行、Spec 报告 ≤30 行的上限未实现（弱化）；② 自创 `reviews/**≤120` 兜底对"不设硬上限"的 Impl / Issue Impl / 质量门报告**新增**限制——B 仓现存 `specpipe-v2-s1-rules-impl-revision-1.md`（144 行）、`specpipe-v2-s2-core-impl-revision-1.md`（130 行）将直接报警，`ocp check line-budget` 在本仓/用户项目产生确定性误报；③ spec 规则 10 明确"规则按 06-artifacts 上限"。
   - 建议：改为按 06 逐类 glob：`*-epic-spec-revision-*.md` ≤40、`*-spec-revision-*.md` ≤30、`spec.md` ≤300、`epic-spec.md` ≤500、`issue-impl.md` ≤80；impl / issue-impl / quality-gate 报告**不配规则**（不设限）；删除 120 兜底。

2. **D5 history 增强校验实现口径未钉死（子串匹配 vs 字段解析）** — 严重程度：**medium**
   - 影响：07 卷契约示例为空格形态（`"to": "DONE"`），S2 stage 插件写紧凑形态（`JSON.stringify`）——两形态并存。impl 文中 `核含 "to":"DONE" 且 "from":"QUALITY_GATE" 行` 若按字面子串实现，空格形态的合法留痕将被判"无质量门行"→ 误拒推送；且测试未含该判别用例（"history 存在但缺行 → 拒"亦缺失）。
   - 建议：钉死为"逐行 `JSON.parse` 后比较 `from`/`to` 字段（容错空白与键序）"；改动点 14 补两用例：① 空格形态（07 示例）放行；② history 存在但无 `QUALITY_GATE→DONE` 行 → 拒绝。

3. **D8"边集未适配"无机械判据** — 严重程度：**medium**
   - 影响：快照对账（快照 vs 数据文件）是 B 侧内部一致性，无法感知 A 侧 07 卷变更——若照字面实现"跑对账，失败才非零退出"，则 spec 规则 5 要求的"契约已变，边集需人工适配"报警**永不触发**；若按哈希变化实现，又需明确"相对何值变化"。
   - 建议：钉死判据——"本次同步后 07 卷新哈希 ≠ vendor 段旧声明 → 视为契约已变 → 提示 + 非零退出（边集是否需适配由人工走 B 仓 Story/Issue 裁决）；哈希未变时跑快照对账，失败才非零退出"；改动点 32④ 按此锚定断言。

4. **D15 输入载体未定义（检索三通道声明 / 本地 A 仓路径）** — 严重程度：**medium**
   - 影响：spec 规则 8 要求报告"哪些职责位未声明/不可用"，但 impl 仅写"读用户配置声明 + which 探测"——声明介质（哪个文件/字段）未指定；"与本地 A 仓路径对比提示"的路径来源同样未指定；README/BOOTSTRAP 也只写"用户配置声明"。Builder 只能自创接口，用户无从声明。
   - 建议：钉死载体（如 `configs/doctor-config.json`：`retrieval: {primary, fallback, docs}` 三项命令 + `localARepoPath`），`ocp init` 生成默认模板；并在 README/BOOTSTRAP 同步说明（顺带明确项目 agents 检测路径）。

### Low

5. **快照元素形态与比较身份建议显式钉死（D7/D13③）** — 严重程度：**low**
   - 影响：`snapshot.states/transitions` 的元素字段与比较键未定义；若落为仅 `from→to` 对比，trigger/actor 变更与 state flags（blocking/terminal/shared）变更不被"留痕"；同目标双边（REJECT 与 OVERTURN）也依赖 trigger 区分。
   - 建议：显式声明"与 `EXPECTED_STATES`/`EXPECTED_EDGES` 同构（含 flags 与 actor/trigger），比较键同 `edgeKey`（from→to|trigger|actor）"。

6. **标注与笔误** — 严重程度：**low**
   - 影响：改动点 2/3/4 标"重写"，但 `cli/commands/` 目录不存在（块A 实为新建，B/C 重写对象是块A stub）；D5"Eopic 判定"笔误；D18"不改 D2 三步语义"引用笔误（应为"不改既有 fence 三步语义"）。
   - 建议：逐处校正（S2 审查有"新建 vs 更新"标注不符的先例）。

7. **hook 薄壳生成物与可执行形态未钉死** — 严重程度：**low**
   - 影响：未声明 `#!/bin/sh` 首行、chmod +x（无执行位 git 静默跳过 hook）；D2"生成时探测写死单形态"与风险表"薄壳 command -v 兜底提示"口径不一致——运行期 ocp/bun 缺失时应有一致行为（否则 `exec ocp` 127 直接阻断推送）；`cli/index.ts` 作为 bin 也缺 shebang（npm/bun 全局安装形态 `ocp` 需可执行）。
   - 建议：钉死薄壳内容模板（运行时优先 `ocp`、回退 `bun <绝对路径> cli/index.ts`、均不可用 echo 警告后 `exit 0` 不阻断）+ 生成物内容断言覆盖；`cli/index.ts` 补 `#!/usr/bin/env bun` 与执行位。

8. **D3 奇异形态兜底与读取口径** — 严重程度：**low**
   - 影响：local_sha 全零（删除推送）、根 commit 无 `~1`、多 ref 行、非 FF 推送均未声明；校验读工作区 `.stage` 还是推送提交内文件（`git show local_sha:...`）未声明；diff 中 topic 路径为删除时 `.stage` 查找失败会误拒。
   - 建议：补一句"diff 不可解析/无常规范围 → WARN 放行不阻断"；声明读取口径（建议以推送提交为准或显式声明工作区口径）；删除类路径按"推送后仍存在的 topic"判定。

9. **D14 词表与范围两点** — 严重程度：**low**
   - 影响：① 内置词表与 S1 impl 禁词表存在映射差异（原表含独立 `external_directory`、`.opencode`、`agents/`、`~/.config`、`save_memory`、`MEMORY.md`、`npm`、`tmux`、角色英文名等，D14 仅 `permission.external_directory` 复合形态等）——"覆盖原 banned-words 场景"打折；② 默认扫描仅 vendored 07+templates 子集，Epic 验收 6"全 A 仓零命中"需 `--path` 指向 A 仓（能力有，缺说明）。
   - 建议：把 S1 禁词表按类纳入内置/extra 默认（或记录映射说明）；文档/验收注明"全仓检查以 `--path` 指向 A 仓执行"。

10. **D13① 未遍历 vendor.files 全量** — 严重程度：**low**
    - 影响：D6 为 templates 逐件录哈希，D13① 只对 07 卷重算比对——templates 被篡改不报警，录制与校验不对称。
    - 建议：① 改为遍历 `vendor.files` 全量逐一重算 sha256。

11. **D5 topic 正则与 archivePrefix 配置一致性** — 严重程度：**low**
    - 影响：D4 的 archivePrefix 可配置，D5 提取正则硬编码 `^\.specpipe/plans/`——两者若不一致，topic 永不命中、门禁静默降级为全 WARN。
    - 建议：topic 提取从配置的 archivePrefix 派生（默认 `.specpipe`）。

12. **init 自举产物、安装路径与文档落点** — 严重程度：**low**
    - 影响：① 对 B 仓执行 `ocp init --hook` 会额外铺设 `.specpipe/templates/`（与 configs/vendor 重复）与 `scripts/fence.sh`（与 run-test-fence.ts 并存）——自举应只装 hook 或明确清理/不提交；② hook 安装路径建议 `git rev-parse --git-path hooks` 解析（worktree 下 `.git` 为文件、`core.hooksPath` 自定义）；③ spec 规则 1 两处"文档明示"（`{wf}` 忽略降级语义、`--no-verify` 逃生）无落点；`cli/README.md` stub 注记交付后过期、`check-tools/README.md` 的描述（"A 仓文档 vs configs/ 数据文件"）与 D13 口径不齐、根 README `ocp stage set` 示例待校。
    - 建议：自举步骤改为"仅执行 hook 安装"或运行后清理计划外产物；补文档更新条目（README/cli/check-tools 三个 README）。

13. **D17 基准分支语义与输出指引** — 严重程度：**low**
    - 影响：D17 未声明 `git worktree add` 的基准（默认 HEAD vs 按目标映射：dev→主干 / rel→发布 / ms→主分支）；只写"输出后续指引"未列内容。
    - 建议：补基准语义（默认当前 HEAD，可配置）；指引对齐 10 卷 5 步工作流要点；A 卷表格 dev 行表述张力备查（默认集可配置已缓解）。

14. **D18 步骤入口与退出码未钉死** — 严重程度：**low**
    - 影响：第四步如何"调核心"未给命令形态（fence 步骤模型为子进程 + 退出码判定）；check 子命令退出码约定未声明；步骤名 `consistency` 与验收 1 的"transition-consistency"表述不齐。
    - 建议：钉死为 `bun cli/index.ts check transition-consistency`（或独立 runner），声明 0=PASS / 1=FAIL / 2=用法错误；步骤名对齐。

15. **测试前提与可测性两处** — 严重程度：**low**
    - 影响：① 改动点 9"空目录实跑 init + hook 生成物断言"——mkdtemp 空目录无 `.git`，hook 无从安装，需先 `git init`（或声明无 .git 时行为）；② 改动点 10"JSON 模式断言"与 D15"输出对齐表格"不一致——doctor 需 `--json`（或改为对探测函数返回对象断言）。
    - 建议：测试步骤写明前置 `git init`；D15 补 `--json` 或测试改函数级断言。

16. **vendor-sync `--tag` 的网络依赖与失败路径** — 严重程度：**low**
    - 影响：`--tag` 模式 clone 的仓 URL 来源（首次运行 vendor 段尚无 `repo` 字段）、网络/克隆失败处理、临时目录清理均未声明。
    - 建议：声明 A 仓 URL 常量/配置与 clone 失败的非零退出提示；临时目录用后即删。

## 结论

# REJECT

状态：IMPL_REVIEWING → IMPL_DRAFT

> 复审建议：问题 #1~#4 为必改项（其中 问题 #1/#2 属"照字面实现即出错"的确定性缺陷）；low 建议随改。复审时重点核：D11 规则表、D5 history 用例、D8 判据、D15 载体四处。另：spec 本身无需推翻——本报告未发现问题触及 spec 层面（REJECT 而非 SPEC_OVERTURN）。
