# Impl: Story 1 — A 仓规章 v1（SpecPipe 仓原址删减重组）· rev 3

> rev 3：按 impl-revision-2 审查修复——**基线同步步骤**（双源分叉：全局副本领先 GitHub 仓，5 文件分叉清单）、等价底稿落盘与传递、质量门纯文档仓适配、v1「Builder」术语遗留修正注、index.json 计数 25、checker.md 描述精确化、.gitignore 处置细化、安装者断言弱化。
> rev 2：按 impl-revision-1 审查修复——文件处置补全（index.json/package.json）、报告模板来源更正（checker.md）、新增语义等价校验环节、共用约定扩充（术语对照/H1 命名/引用矩阵）、关键规则 15 条落位表、3 处内容块补落位、Builder 输入闭合性、回归面补 skills.urls 影响。

## 技术方案

### 总体策略（Git 操作序列）

1. **本地克隆处置**：本地既有克隆 `/home/starlex/project/SpecPipe`（origin/main = `6dbaadb`，工作区干净）——`git fetch origin` 后**基于 `origin/main`** 在独立 worktree 拉分支 `dev/feat/spec-v2-rules`（`git worktree add -b dev/feat/spec-v2-rules ~/.local/share/opencode/worktree/dev/feat/spec-v2-rules origin/main`），不使用本地克隆的工作区状态
2. **基线同步（首个 commit）**：全局运行副本领先于 GitHub 仓（实测 5 文件分叉：`specpipe/SKILL.md` 708 行三 CLI 检索版 vs 仓内 700 行 MCP 版、`specpipe/config.md`、`agents/checker.md`、`agents/explorer.md`、`agents/oracle.md`）——**v1 内容基线权威源 = 全局副本 `~/.config/opencode/skills/specpipe/` 与 `~/.config/opencode/agents/`**。首个 commit 将这 5 个分叉文件以全局副本覆盖至分支（`chore: 同步本地 v1 最新运行版至仓库`），使仓内内容与语义等价基准（708 行版）一致；本 impl 全部 v1 行号均以同步后的 708 行版为准
3. **改造**：一次到位（删旧 + 增新均在同一分支，基线同步 commit 之后）
4. **合并**：push 分支至远端，**用户验收（质量门 PASS + 放行）后由用户合并 main**——Oracle 不动 main
5. **本地隔离**：`~/.config/opencode/skills/specpipe/`（v1 skill 运行环境）不动；改造期间 main 不变，`skills.urls` 安装源不受影响。**回归面声明**：main 合并后本仓不再是可独立安装的 skill 源（无 SKILL.md）——README 交接说明需写明"安装请转向 OpenCodePipe"；据用户自述当前安装者仅为用户本人，切换由 Story 4 统一处理，风险可控

### 内容生产方案（三任务块并行 + 语义等价校验 + Oracle 一致性终审）

12 类交付按文件集不相交切三块并行；**每块 Builder 的执行报告必须附「逐项对照表」**（impl 改动点的 v1 源条目 → 新卷条目，一行一条）——Oracle 汇总为语义等价核查底稿，**落盘至 `{wf}/plans/specpipe-v2-s1-rules/equivalence-check.md`**，质量门时 Checker 对照该文件抽查（无状态 Checker 经任务书附路径 read 获取——**语义等价的可执行验证环节**，行为面冻结的落地点）。完成后 Oracle 做全仓一致性 pass（术语 / 编号 / 交叉引用 / H1 命名）再整理 commit。

| 任务块 | 文件 | 内容来源 |
|---|---|---|
| **块 A 流程族** | README、01、02、03、04、05 | 改动点 A1~A6 |
| **块 B 工件族** | 06、07、templates/（9 文件） | 改动点 B1~B3 |
| **块 C 协作族** | 08、09、10 | 改动点 C1~C3 |

**Builder 输入闭合性**（无状态代理看不到本会话上下文）：任务书必须自带——① 本 impl 的共用约定与术语对照表**全文**；② 该块改动点章节**全文**；③ v1 源文件绝对路径清单。调研报告不传递（其结论已固化进改动点）。

### 共用约定（三块 Builder 必须遵循，任务书全文内嵌）

- **H1 命名**：每卷 H1 = 文件名去扩展名 + 破折号 + 职责短语（如 `# 06-artifacts —— 工件规范`）；文件头随后 ≤2 行：本卷职责 + 适用阶段
- **「原样迁移」定义**：语义原样（条件 / 边界 / 数值不弱化不省略）+ 术语按对照表转换 + 格式按模板引用
- **术语对照表**（v1 → v2，正文一律用 v2 词；**v1 术语遗留修正**：v1 文中「Builder」在状态机分工、文件产出表、放行后置 APPROVED 等处**实指调度者**（主会话职责），v2 一律按实际职责映射为调度者，仅在真正编码执行语境保留"执行者"）：

| v1 | v2 |
|---|---|
| Oracle / Explorer / Checker / Builder / Looker | 调度者 / 调研者 / 审查者 / 执行者 / 视觉解析者（v1「Builder」实指主会话职责处 → 调度者） |
| subagent | 下级代理 |
| skill / SKILL.md | （概念不出现在正文；README 交接说明除外） |
| tmux | 可持久化后台会话 |
| task 工具 / subagent_type | 下级代理调用机制（代理标识 = 代理定义文件名） |
| permission / external_directory | 路径写权限白名单 / 外部目录授权 |

- **保留英文原文**：`.stage`、`.stage-history`、`{wf}`、`plans/`、`reviews/`、`spec.md`、`impl.md`、`worktree`、`fence`（首现加注，如"测试围栏（fence）"）、`topic`
- **引用规则**：卷间引用相对路径文件名；模板引用 `templates/xxx-template.md`；流程卷（02~05）不重复格式定义只引模板；01~10 间引用单向：流程卷 → 工件/协作卷，工件/协作卷间可互引，**不反向引用流程细节**（避免环路）
- **配置表述**：只列配置项与联动规则，不写配置机制（归 B 仓）
- **行数预算**：单卷 ≤150 行（README 例外）

### 平台无关禁词表（自验 grep，命中即违规）

`opencode`、`SKILL`、`skill`（README 交接段除外）、`task 工具`、`subagent_type`、`permission`、`external_directory`、`agents/`、`~/.config`、`.opencode`、`save_memory`、`MEMORY.md`、`npm`、`mvn`、`pip`、`tmux`、CLI 名（tvly/exa/c7）、provider 名、`json 覆盖`、角色英文名（Oracle/Explorer/Checker/Builder/Looker，对照表映射）。

### 关键规则 15 条落位表（v1 L650-669 → v2 卷）

| # | v1 条目 | 落位 |
|---|---|---|
| 1 | 调度者驱动全流程 | 01 总则 + 02 |
| 2 | Plan 阶段不编码 | 01 总则 |
| 3 | 用户参与点清单 | 02 公共环节 + 03/04/05 各环节标注 |
| 4 | 记忆三层无独立记忆文件 | 06 |
| 5 | 文档与记忆使用中文 | 01 总则 |
| 6 | 分级必经且允许重调整 | 02（S2 节） |
| 7 | Epic 先 Spec 再拆 Story | 04 |
| 8 | Epic 下 Story 独立 topic | 04 + 06 |
| 9 | Issue 不走 Spec | 05 |
| 10 | Issue 可升级 | 05 |
| 11 | 审查深度分级（五类） | 09 |
| 12 | Impl 通过后不阻塞 | 03 / 05 |
| 13 | 编码必须 worktree+新分支 | 10 |
| 14 | 质量门终检 + fence 并行 + 增量重跑 | 03 + 09 + 10 |
| 15 | LCR | **废弃**（spec 裁决，不迁移） |

## 改动点

### 文件处置清单（改造全貌，含仓根实测文件）

| 处置 | 文件 | 说明 |
|---|---|---|
| 删除 | `specpipe/SKILL.md` | 内容提炼入 01~10（按落位表） |
| 删除 | `specpipe/config.md` | 配置项清单文档化入 01；机制归 B 仓 |
| 删除 | `specpipe/docs/quality-gate.md` | 内容入 09 + templates |
| 删除 | `specpipe/docs/git-branch-guide.md` | 内容入 10 |
| 删除 | `specpipe/docs/review-rules/`（21 文件） | 不迁移（归 B 仓 Story 2 取） |
| 删除 | `agents/`（5 文件） | 不迁移（归 B 仓 Story 2） |
| 删除 | `index.json` | 列 25 个改造后将消失的路径，残留即引用断裂死清单；A 仓 v2 不再是 skill 安装源，索引无意义 |
| 删除 | `package.json` | keywords 含 `opencode`/`skill` 平台词；纯 markdown 规章仓无需包定义 |
| 保留 | `LICENSE` | 原样 |
| 保留+核查 | `.gitignore` | 保留；改造时核查内容适配（若有 skill 构建产物相关条目一并清理） |
| 重写 | `README.md` | A6 |
| 新增 | `01` ~ `10`、`templates/` | A1~A5 / B1~B3 / C1~C3 |

### 块 A：流程族（v1 行号为约 L##，语义定位为准）

- **A1 `01-general.md`**（~80 行）：总则硬条文 ≤20 行——v1 关键规则 1/2/5 + 放行不自动推进（约 L108）+ impl 唯一事实源（约 L313）+ 异家族互查 + 最小验证原则；工作流触发（v1 L25-30 抽象化）；需求分级表（L32-42 语义原样：三行判定特征 + 判定说明）；配置项清单（v1 config.md 的 5 组：工作流根目录 / 各角色模型 / 检索工具三 CLI 抽象名 / Git 三分支 / 临时目录 + 联动规则）；`{wf}` 路径约定（v1 L18-19 抽象：工作流根目录占位符，默认映射 `.specpipe/`，可配置）；**分卷加载声明**（v1 L23 按需加载机制的抽象：各卷按工作阶段加载，卷粒度 = 加载单位）
- **A2 `02-workflow.md`**（~100 行）：三路径总览图（L44-59 原样，三条注释保留）；公共环节四节——S0 调研（L65-80：双任务 / 可并行 / 输出不落盘；调用模板段删，归 08）、S1 前置访谈（L82-88）、S2 分级判定（L90-108：四场景 + 判定输出格式 + 阻塞声明）、用户放行机制（L110-119：语义判定规则 + 不自动推进）
- **A3 `03-story-path.md`**（~130 行）：Story 七环节（L206-318 语义原样：S-S3~S-S10；S-S9 编码 7 步含任务切分文件集不相交 / fence 后台化与汇合点 / 增量重跑）；格式定义抽走引 templates；任务书四要素引 08
- **A4 `04-epic-path.md`**（~90 行）：Epic 路径（L122-203 语义原样：E-S3~E-S5 / 路线图推进 / 并行 Story 条件 / Epic 下 S2 确认性判定 / 终检三校验）
- **A5 `05-issue-path.md`**（~80 行）：Issue 路径（L321-389 语义原样：I-S3~I-S7 + 升级机制 4 步）
- **A6 `README.md`**（~40 行）：定位段 ≤10 行（SpecFirst 一句话 + "SpecPipe（本仓：规章）/ OpenCodePipe（实现：硬件层面践行本规章）" + 规范体声明）；卷导览表（12 文件一句话职责 + 加载场景）；**交接说明**（本仓 v2 起为纯规章仓，skill 安装形态转向 OpenCodePipe）

### 块 B：工件族

- **B1 `06-artifacts.md`**（~120 行）：工件产出表（v1 L673-686 改造：topic 无前缀 kebab-case、LCR 行删、.stage-history 行增）；**topic 取值规则**（v1 L694-698 抽象迁移：Epic 与其下 Story 各自独立 topic 目录 / 独立 Story / Issue 的命名一致性约束）；各工件定义（每工件一节：目的 / 何时产出 / 产出者 / 行数上限 / 格式引模板）——epic-spec / spec / impl / issue-impl / 五类审查报告 / AGENTS.md 三层记忆（v1 L653 语义原样但**路径抽象化**：全局层（全局配置目录）/ 项目层（项目根）/ 任务层（`{wf}/plans/{topic}/`）；不设独立记忆文件声明保留）；审查轮次 N 计数（L692 原样：各类型独立、审查者计数 +1）；行号语义标注规范（约 L270 原样）；organic 产物声明（本版不定义为标准工件）
- **B2 `07-state-machine.md`**（~100 行）：三路径状态链（L497-509 原样）；状态更新职责分工（L511，**术语修正**：v1「Builder 与 Checker 分工」实指调度者与审查者——流程推进归调度者、审查落定归审查者）；Checker 状态转移表（L515-521 五行表原样）；**状态规则 10 条**（L523-533：SPEC_OVERTURN 连锁回退 / N≥3 人工裁决 / 回 S2 不重跑调研等，按 v1 实际条数全量）；中断恢复（L535-552：七类恢复点 + 残留处置 + 恢复前提）；`.stage` 格式（单行状态名）；`.stage-history` **新增定义**（JSONL：`{ts, topic, from, to, actor}`，actor ∈ {调度者, 审查者}——B 仓工具留痕契约，与职责分工一致）
- **B3 `templates/`**（9 文件，kebab-case 命名，中文，各 ~30-60 行）：`epic-spec-template.md`（v1 L141-159）、`spec-template.md`（L226-240）、`impl-template.md`（L262-268）、`issue-impl-template.md`（L339-352）；五类审查报告模板 `review-epic-spec-template.md`（≤40 行）/ `review-spec-template.md`（≤30 行）/ `review-impl-template.md` / `review-issue-impl-template.md` / `review-quality-gate-template.md`——**格式权威来源**：v1 SKILL.md 各审查节（清单 / 路径 / 行数约束）+ **`~/.config/opencode/agents/checker.md` 中的审查报告格式章节（轻量 / 完整等分套结构，以实际内容语义定位为准，约 L124-158 附近）**。每个模板：章节骨架 + 每节注释性内容规约（写什么 / 行数上限 / 必填与否）——面向代理的工件参照

### 块 C：协作族

- **C1 `08-roles.md`**（~90 行）：五角色职责矩阵（v1 L560-566 平台无关化：中文名 / 状态 / 上下游 / 职责 / 输入输出；模型列删——归 user-rule 组合）；角色定位 5 条（L568-573 抽象：平级互不调用 / BLOCKED 上报裁决 / 无状态交叉验证 / 执行者并行文件集不相交 / 视觉解析按调度者模态可选）；任务书标准（L577-587 四要素 + 责任倒逼原样）；调度协议（L589-632 抽象：代理标识 = 定义文件名 / 材料显式传递 / 三类权限边界原则化（只读 / 写白名单 / 编码域）/ 产出落盘 / 无状态含义 / 并行规则）；检索工具职责（L636-644 抽象：主搜索 / 备选 / 文档查询三 CLI 职责表；命令与白名单归 B 仓）
- **C2 `09-check-split.md`**（~90 行）：检查分流表（机械项归工具 / 语义项归审查者，两列列举）；五类审查清单（Epic Spec 3 项约 L165-168 / Spec 2 项约 L248-252 / Impl 6 项约 L280-287 / Issue Impl 约L362 / 质量门 7 项约 L469-476 + quality-gate.md 展开）；评分规则（critical -25 / high -12 / medium -5 / low -2）；审查深度分级（关键规则 11）；规则注入机制（按文件后缀映射注入；规则库本体归 OpenCodePipe，本卷仅定义注入机制与豁免边界）
- **C3 `10-composition.md`**（~80 行）：编码环境规范层（v1 L392-459 抽象：前置条件（impl 审查通过 + 主干同步）/ worktree+新分支纪律 / 依赖初始化 best-effort（**不写具体包管理命令**）/ 审查期预热与放行解耦 / 清理）；Git 分支策略（L700-704 + git-branch-guide.md 合并：三级分支表 + 5 步工作流 + 注意事项）；fence 编排（S-S9 步骤 5/7：冻结后即启动（**可持久化后台会话**抽象，v1 L480-486 tmux 命令不迁移）/ 与审查并行 / 汇合点 / 增量重跑三规则）；user-rule 组合覆盖**新增**（加载顺序：总则 → 项目规则 → user-rule 后者覆盖同名项；入仓筛选"换人依然成立"测试）

## 验证方式（Builder 最小自验 + 收尾统一）

- **Builder 块内自验**：① `wc -l` 各卷 ≤150；② 禁词表 grep 零命中（块内文件）；③ 引用完整性：grep 引用文件名 vs `ls` 实际文件；④ **逐项对照表**附报告（v1 源条目 → 新卷条目）
- **Oracle 收尾统一验证**：全仓禁词扫描 / 交叉引用矩阵校验 / 术语一致性抽查 / **等价底稿汇总落盘**（`{wf}/plans/specpipe-v2-s1-rules/equivalence-check.md`）
- **质量门纯文档仓适配声明**：质量门 7 项中——第 4 项（整体编译）与第 5 项（测试 fence）替换为**机械校验**（禁词全仓扫描 / 交叉引用完整性 / 行数预算核对）；第 6 项（测试覆盖回归）替换为**语义等价抽查**（对照 equivalence-check.md 逐卷抽核 v1 源条目）；其余四项（impl 一致性 / 报告质量 / commit 信息 / 文档归档）照常适用
- 无编译 / 测试（纯文档仓）；commit 可独立阅读

## 依赖

- 本地克隆 `/home/starlex/project/SpecPipe`（fetch + 基于 origin/main 拉分支；基线同步 commit 先行）
- GitHub push 权限（分支级）
- **v1 内容基线权威源 = 全局运行副本**：`~/.config/opencode/skills/specpipe/`（SKILL.md 708 行版 / config.md / docs/quality-gate.md / docs/git-branch-guide.md）+ `~/.config/opencode/agents/checker.md`（B3 报告模板格式源，只读）；分叉文件清单见总体策略步骤 2
- review-rules 目录仅确认存在（21 文件），不读取内容

## 风险

| 风险 | 缓解 |
|---|---|
| 双源分叉（全局副本 vs GitHub 仓） | **基线同步 commit 先行**（5 分叉文件以全局副本覆盖），行号与等价基准统一锚定 708 行版；diff 清单已实测固化于本 impl |
| 语义漂移（提炼弱化条件） | **逐项对照表机制**：Builder 报告附 v1 源→新卷对照；Oracle 汇总落盘 equivalence-check.md；质量门 Checker 对照抽查（可执行环节，非仅审查承诺） |
| 平台词泄漏 | 禁词表块内 grep 自验 + Oracle 全仓扫描 + Checker 复扫 |
| 三块并行风格漂移 / 引用断裂 | 共用约定（H1/术语表/引用规则）任务书全文内嵌 + Oracle 一致性 pass |
| index.json 死链（合并后外部引用） | 交接说明进 README；据用户自述安装者仅为本人，Story 4 统一切换 |
