# 审查报告: specpipe-v2-s3-cli — Impl (Revision 2)

## 总体评价

**通过（PASS，非 SPEC_OVERTURN）**。

rev2 对上轮 4 medium + 12 low 的修订**逐项落位、无残留 high/critical**：

- **4 项 medium 全部根治**：
  - #1 D11——规则表按 06 卷逐类钉死（spec ≤300 / epic-spec ≤500 / issue-impl ≤80 / Epic Spec 报告 ≤40 / Spec 报告 ≤30），自创 120 兜底已删，impl 与 impl/issue-impl/质量门报告**不配规则**，并补「144 行 impl 报告不误报」反向用例；
  - #2 D5——history 改「逐行 `JSON.parse` 后比较 `from`/`to` 字段」容错空格/键序两形态（双源实测：07 卷示例空格形态、`src/plugin/stage-ops.ts` L119 `JSON.stringify` 紧凑形态），补「存在但无 QUALITY_GATE→DONE 行 → 拒」+「空格形态放行」两用例（②b/③b）；
  - #3 D8——判据钉死为「新 07 哈希 ≠ 旧声明 → 视为契约已变 → 提示 + 非零退出；未变 → 快照对账失败才非零」+ 首跑「首次基线」路径，用例 ④ 锚定两分支；
  - #4 D15——载体钉死为项目级 `{wf}/doctor-config.json`（init 生成默认模板）→ 用户级 `~/.config/opencodepipe/doctor.json` 二级查找（项目级优先，均无 → WARN）；字段 `retrieval{primary,fallback,docs}` + `localARepoPath`；测试改函数级断言 + CLI `--json`。
- **12 项 low 中 9 项完全吸收**：快照同构与比较键（#5）、标注笔误（#6）、薄壳三段 + shebang/chmod + git-path（#7）、fail-open + 删除豁免 + 读取口径（#8）、vendor.files 全量遍历（#10）、正则从 archivePrefix 派生（#11）、基准分支默认 HEAD + 五步指引（#13）、D18 命令形态 + 0/1/2 退出码（#14）、git init 前置 + 函数级断言（#15）；**3 项部分吸收**（#9/#12/#16 残项 → 见「发现的问题」2~5）。
- **上轮通过项无回归**：spec 十条业务规则、七条验收映射完整；四块文件集（改动点 1~34）逐文件核对**仍不相交**（A↔B/C 的 hook.ts/check.ts 为显式顺序交接，C→D 的 transition-consistency 导入为运行时收敛）；D6→D8→D13→D18 闭环经 A 仓实测可闭合（HEAD `ec746ea` == transition-table.json `source`；templates 九件在场；`tests/table.test.ts` 18 态/28 边/`edgeKey` 与 D7 同构）。
- **rev2 新引入内容自检**：D2 三段薄壳（ocp 优先 → bun 回退 → 双缺警告 exit 0）自洽；D15 二级优先级自洽；D11 与 06 卷逐条一致，但留 1 处**匹配语义缺口**（问题 1，medium，不阻塞——一行级补丁，建议随块 C 任务书附注）。

## 评分

**87 / 100**（1 medium × -5 + 4 low × -2）

## 审查材料

impl.md（rev2，105 行）/ spec.md（rev2，55 行）/ impl-revision-1 报告（165 行）/ A 仓：06-artifacts.md 逐类上限逐条对照、07-state-machine.md（L11 空格形态 JSONL 示例）、09-check-split.md、10-composition.md（L58-60 五步）、templates 九件在场、HEAD `ec746ea` == transition-table.json `source`（git log 实测）/ B 仓现状：cli/index.ts stub（4 行）与 cli/commands/ 缺失、check-tools/ 仅 README、configs/transition-table.json（77 行）、scripts/run-test-fence.ts（139 行 / 3 步 steps 数组）、tests/table.test.ts（238 行 / 18 态 / 28 边 / `edgeKey`）、src/core/table.ts（裸 cast 无严格 schema——vendor 段追加无碍，`vendor` 键与表测试断言无交）、src/plugin/stage-ops.ts（L119 `JSON.stringify` 紧凑形态）、package.json（`bin.ocp`）、.gitignore（6 行，已含 test-fence-reports/）、三 README + docs/BOOTSTRAP.md、AGENTS.md、reviews 目录 15 份实测（144/130 行 impl 报告在场；Epic 报告 34 行——问题 1 实例）、plans 四 topic（均无 .stage-history；Epic 目录含 epic-spec.md）。

## 16 项修订核验表

| # | rev1 问题（级别） | rev2 修订落位 | 判定 |
|---|---|---|---|
| 1 | D11 与 06 双向偏差（medium） | D11 规则表逐类钉死、删 120 兜底、三类报告不设限；改动点 24 补 144 行反向用例 | **已根治**（残匹配语义缺口 → 问题 1） |
| 2 | D5 history 实现口径（medium） | 逐行 JSON.parse 比较字段、双形态容错、缺行拒；用例 ②b/③b | **已根治**（双形态经源码实测确认） |
| 3 | D8 对账判据（medium） | 哈希变化判据 + 首跑「首次基线」；用例 ④ 锚定两分支 | **已根治**（首跑退出码 → 问题 2） |
| 4 | D15 输入载体（medium） | 二级配置 + 字段三职责位 + init 模板 + 函数级/--json | **已根治** |
| 5 | 快照形态与比较键（low） | D7 同构（states 全 flags / transitions 四字段）+ 比较键 state=name、edge=`from→to\|trigger\|actor` | **已吸收**（与 table.test.ts 实测同构） |
| 6 | 标注与笔误（low） | 改动点 2~6 改「新建」；Epic 判定；「既有三步语义不变」 | **已吸收** |
| 7 | 薄壳生成物与可执行形态（low） | D2 三段模板 + chmod + 幂等 + `git rev-parse --git-path hooks`；D1 shebang + 执行位；改动点 9 内容断言 | **已吸收** |
| 8 | D3 奇异形态与读取口径（low） | fail-open（全零 sha / 无 `~1` / 不可解析）+ 删除路径豁免 + 工作区读取口径 + WARN | **已吸收** |
| 9 | D14 词表与范围（low） | 扩展 12 类词 + `--path` 全仓口径文档注明（改动点 25） | **部分吸收**（残 9 类 → 问题 4） |
| 10 | D13① 未遍历全量（low） | 遍历 `vendor.files` 全量逐件重算；用例 ② 含 templates 篡改 | **已吸收** |
| 11 | topic 正则与 archivePrefix（low） | D5 正则从配置派生（默认 `^\.specpipe/plans/([^/]+)/`） | **已吸收** |
| 12 | init 自举/安装路径/文档（low） | 自举声明「仅执行 hook 安装」+ 三 README 更新条目 + git-path 解析 | **部分吸收**（机制歧义 → 问题 3；文本点 → 问题 5） |
| 13 | D17 基准分支与指引（low） | 默认 HEAD + target→base 可配置 + 五步指引 | **已吸收** |
| 14 | D18 入口与退出码（low） | `bun cli/index.ts check transition-consistency` + 0=PASS/1=FAIL + 全命令 0/1/2 + 块D 标注 | **已吸收** |
| 15 | 测试前提与可测性（low） | 改动点 9 前置 `git init`；D15 函数级断言 + `--json` | **已吸收** |
| 16 | `--tag` 网络依赖与失败路径（low） | 失败非零退出 + 明确提示 + 临时目录即删 + `vendor.repo` 来源 | **部分吸收**（首跑 URL 回退 → 问题 2） |

## 其余核对

### 无回归 — 通过

- 范围对齐：spec 规则 1~10 落点未破坏（1→D3+D4+D5、2→D6+D7+D13、3→D18+D15、4→D1、5→D8、6→D2+D16、7→D16、8→D15、9→D17、10→D9~D14）；验收 1~7 映射完整（5 留证仍归调度者，改动点 34 明示非 Builder 交付）。
- 闭环可行性：A 仓 HEAD `ec746eac…` == transition-table `source`（首跑 `--path` 直接成立）；`templates/` 九件在场且命名吻合；`vendor` 段追加不触发 table.test.ts 任何断言（source 格式/边数/状态数/history.fields 均不相交）。
- 既有 fence：`run-test-fence.ts` steps 数组天然支持追加第四步，既有三步命令与语义未被修订触碰。

### 四块文件集逐文件核对（rev2 重编号后）— 不相交

- **块A（1~10）**：cli/index.ts、cli/commands/{init,doctor,worktree,check,hook}.ts、configs/worktree-config.json、scripts/fence-template.sh、tests/cli-init.test.ts、tests/cli-doctor-worktree.test.ts；
- **块B（11~14）**：cli/commands/hook.ts（重写 A stub）、cli/commands/hook-core.ts、configs/prepush-config.json、tests/hook-core.test.ts；
- **块C（15~25）**：cli/commands/check.ts（重写 A stub）、check-tools/{whitespace,line-budget,commit-format,platform-words,task-yaml}.ts、configs/{line-budget,commit-format,platform-words}.json、tests/check-tools.test.ts、cli/README.md、check-tools/README.md、README.md；
- **块D（26~34）**：configs/vendor/specpipe/{07-state-machine.md + templates×9}、configs/transition-snapshot.json、configs/transition-table.json、scripts/vendor-sync.ts、check-tools/transition-consistency.ts、scripts/run-test-fence.ts、tests/transition-consistency.test.ts、hooktest-record.md（调度者执行）。
- B/C/D 三方互不相交；A↔B/C 两处显式顺序交接（hook.ts / check.ts）；C 的 check.ts → D 的 transition-consistency.ts 为运行时导入、D 的 fence → C 的 check 路由为运行时收敛，均在 D18「块D 收尾后全量 fence」标注下成立。

### 测试用例更新核对 — 通过

- hook-core（改动点 14）：②b 空格形态放行 / ③b history 存在但无行 → 拒 / ⑦ topic 整目录删除不触发（六用例 → 九用例）✓；
- check-tools（改动点 24）：144 行 impl 报告不误报反向用例 ✓（两份实证报告在场：`specpipe-v2-s1-rules-impl-revision-1.md` 144 行、`specpipe-v2-s2-core-impl-revision-1.md` 130 行）；
- transition-consistency（改动点 33）：② 篡改 vendored 任一文件（含 templates）→ 哈希 FAIL ✓。

## 发现的问题

1. **D11 规则表 glob 重叠未钉死匹配语义** — 严重程度：**medium**
   - 影响：`{wf}/reviews/*-spec-revision-*.md ≤30` 以通配语义同样命中 Epic Spec 报告 `*-epic-spec-revision-*.md`（后者字面含 `-spec-revision-` 片段）。B 仓现存 `specpipe-v2-split-epic-spec-revision-1.md` 实测 34 行——若实现按「任一命中规则均适用 / 取最严」处理，该**合法报告**（上限应 40）将被判超限（30），与 rev2「不误报合法工件」的修复目标同型复发；若按「规则表顺序首个命中」处理则正确。匹配语义在 D11 / 改动点 21 / 改动点 24 中均未声明。
   - 建议：D11 补一句「多规则命中时按规则表顺序首个命中生效（Epic 规则先于 Spec 规则）」，并在改动点 24 反向用例补「34 行 Epic 报告不误报」。一行级补丁，可在派发块 C 任务书时随附，或回写 impl 增订。

2. **D8 首跑路径两处未钉死** — 严重程度：**low**
   - 影响：① 首跑（无旧声明）「视同哈希变化路径处理」——哈希变化路径含「非零退出」，则块D 最小验证链尾命令（`bun test … && bun run vendor-sync.ts --path …`）与 Story 自身首跑均以非零退出收尾，「（首跑产出 vendored + 基线提示）」的预期判定不明；② `--tag` 首跑时 `vendor.repo` 字段尚不存在，clone URL 回退来源未明示（D6 已给字面 URL，可作默认但未点明）。
   - 建议：D8 明示首跑退出码（视同非零或特判 0）与 `--tag` 首跑 URL 缺省来源。

3. **D16「自举 = 仅执行 hook 安装」与执行机制存在歧义** — 严重程度：**low**
   - 影响：D16 称自举「仅执行 hook 安装（避免铺设与 configs/vendor 重复的 templates 与 fence.sh——由调度者以 `ocp init --hook` 执行）」，但 `ocp init --hook` 是「全量铺设 + 追加装 hook」还是「仅装 hook」未钉死——若为前者，自举仍会铺设 `.specpipe/templates/`、`scripts/fence.sh`、`{wf}/doctor-config.json`，与「避免铺设」目标矛盾（上轮 #12 诉求未完全闭合）；同时验收 2「四件铺设正确」与改动点 9「实跑 init + hook 生成物断言」的调用形态（`init` vs `init --hook`）建议一并明示。
   - 建议：钉死 `--hook` 语义（推荐「全量铺设 + 追加 hook」），自举改为「只执行 hook 安装步骤」的可执行机制（如独立子命令，或明确「运行后删除/不提交计划外产物」），并写清测试调用形态。

4. **D14 词表对 S1 禁词表仍缺 9 类** — 严重程度：**low**
   - 影响：S1 impl 禁词表（L50）含 `skill`/`SKILL`（裸词）、`task 工具`、`subagent_type`、`permission`（裸词）、`~/.config`（裸前缀）、`mvn`、`pip`、CLI 名（tvly/exa/c7）、provider 名、`json 覆盖` 等，D14 内置集未纳入；且「词形边界匹配」下 `subagent`/`SKILL.md` 亦不覆盖 `subagent_type`/裸 `skill`——「覆盖原 banned-words 场景」打折（对 A 仓回归的探测能力弱化）。
   - 建议：上述类别补入内置集或 `extraWords` 缺省，或在 D14 注明分类映射依据（哪些类因何不入默认）。

5. **三 README 更新条目的具体文本点与 doctor 载体说明** — 严重程度：**low**
   - 影响：改动点 25 已列三 README 更新，但未点名此前 #12③/#4 的具体文本：根 README L21 `ocp stage set` 示例（CLI 五命令无 `stage`，对应能力归插件）；`check-tools/README.md`「转移表一致性（A 仓文档 vs configs/ 数据文件）」与 D13 三层口径不齐；doctor 配置载体的用户文档说明（rev1 #4 建议的 README/BOOTSTRAP 同步）。
   - 建议：块 A/块 C 任务书落这三个具体校对点（一行级），随正常文档更新顺手完成。

## 结论

# PASS

状态：IMPL_REVIEWING → IMPL_APPROVED

> 复审说明：4 项 medium 全部根治且经独立实测验证（D11 逐条对照 06 卷 / D5 双形态对源码实证 / D8 判据对 A 仓实测 / D15 载体含 init 模板）；12 项 low 中 9 项完全吸收，残项为问题 2~5（均一行级）。唯一 medium（问题 1，D11 glob 重叠）不构成 REJECT——匹配语义一句话可钉死、影响面为非门禁的 line-budget 检查输出，建议 Oracle 随块 C 任务书附注（或回写 impl 增订），并补「34 行 Epic 报告不误报」反向用例。
