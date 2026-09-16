# 审查报告: specpipe-v2-s1-rules (Revision 2)

## 总体评价

**不通过**

rev 2 对上轮 3 项 high 的修复方向正确、多数已落实：

- **H1（index.json / package.json 处置）已消**：处置清单补入两行（删除 + 理由），仓根实测 8 条目（`.git` / `.gitignore` / `agents/` / `index.json` / `LICENSE` / `package.json` / `README.md` / `specpipe/`）已全覆盖，`specpipe/` 子目录（SKILL.md / config.md / docs/{quality-gate,git-branch-guide}.md / docs/review-rules/21 项）亦无遗漏。
- **H2（报告模板来源 + 隐藏依赖）已消**：B3 格式来源改为「v1 各审查节 + `agents/checker.md` 约 L124-158 两套格式」，且 `checker.md` 已列入依赖节（L119）。实测 `checker.md` L124「## 审查报告格式」～L158 确为两套格式（普通审查 / 质量门），L127-138 与 L141-158 含 `# PASS / # REJECT` 头。
- **H3（语义等价验证）方向正确但未闭环**：逐项对照表机制（Builder 附对照 → Oracle 汇总底稿 → 质量门 Checker 抽查）+ 15 条落位表补入，较 rev1 有实质推进；但对照表无落盘位置与向无状态 Checker 的传递方式声明，独立复核仅「抽查」，且纯文档仓下质量门 7 项清单的适用性未定义（见问题 2）。

上轮 medium/low 中的计数修正（配置 5 组 / 状态规则 10 条 / review-rules 21 文件）、共用约定扩充（H1 命名 / 原样定义 / 术语对照 / 引用规则）、三处补落位（topic 取值 / 后台会话 / `{wf}` 与分卷加载）、既有克隆处置、`skills.urls` 回归面声明、禁词表扩充、templates kebab-case 命名均已落实。

但本轮**实地核对改造目标仓内容**时发现 **1 项新的 high**：impl 的 v1 源基线与改造目标仓内容**不一致**——本地克隆（= GitHub `origin/main`，HEAD `6dbaadb`）的 `specpipe/SKILL.md` 为 **700 行**（MCP 检索版、无「并行 Story」段），而 impl/spec 采用的 `~/.config/opencode/skills/specpipe/` 全局副本为 **708 行**（三 CLI 检索版、含「并行 Story」段）。impl 的全部行号引用只对全局副本成立，Builder 在 worktree 中看到的 `specpipe/SKILL.md` 与之系统性偏移；且 A4「并行 Story 条件」、C1「三 CLI 职责表」、A1「三 CLI 抽象名」所引内容在仓内 v1 中**并不存在**。另有 2 项 medium（语义等价机制残余缺口、术语对照表与 `.stage-history` actor 定义自相矛盾）与 6 项 low。

审查材料：impl.md（rev2）、spec.md、epic-spec.md、v1 全局副本（SKILL.md 708 行 / config.md 53 行 / docs/quality-gate.md / docs/git-branch-guide.md）、`~/.config/opencode/agents/checker.md`（172 行）、本地克隆 `/home/starlex/project/SpecPipe`（`main`，HEAD `6dbaadb`，工作区干净，`git log origin/main` 与本地一致；仓根与 `specpipe/`、`specpipe/docs/`、`specpipe/docs/review-rules/`、`agents/` 逐项实测）。

## 逐项结论

### 1. 术语一致性 — 对照表自洽性基本达标，1 处内部冲突

- 角色名（调度者 / 调研者 / 审查者 / 执行者 / 视觉解析者）、工件名（epic-spec / spec / impl / issue-impl / 五类审查报告 / AGENTS.md 三层记忆）、状态名与 `.stage-history` 字段（ts/topic/from/to/actor）、卷名与 spec 一致 ✓
- 新增术语对照表（L30-39）覆盖 v1 主要平台词：角色英文名、`subagent`、`skill/SKILL.md`、`tmux`、`task 工具/subagent_type`、`permission/external_directory`，与禁词表（L48）**无直接冲突**；「保留英文原文」清单（`.stage`/`.stage-history`/`{wf}`/`plans/`/`reviews/`/`spec.md`/`impl.md`/`worktree`/`fence`/`topic`）合理 ✓
- **冲突（medium，问题 3）**：对照表将 `Builder` 一律映射为「执行者」，但 v1 在「文件产出」表写入者列（L673-686）、状态更新职责分工（L511）、Checker 状态转移表表头（L515「审查前状态（Builder 设置）」）三处的 `Builder` 实指 Oracle（调度者）——机械转换会产出「执行者」，与 impl 新增的 `.stage-history` actor ∈ {调度者, 审查者}（L100）及 v1 正文（Oracle 产出 spec/impl，L562）自相矛盾
- 小项：对照表未覆盖 `subagent`（禁词表亦缺，grep 自验会放过）、`AGENTS.md`、`MCP`；`opencode` 大小写敏感性未声明（README 须写 `OpenCodePipe`，`grep -i` 会误命中）

### 2. 范围对齐 — 12 类交付全覆盖，处置清单完备

- 交付集合：README（A6）+ 01~10（A1~A5/B1~B3/C1~C3）+ templates/（9 文件）= 12 类，与 spec 一致；三块文件集互不相交（A: README+01~05 / B: 06+07+templates / C: 08~10）✓
- spec「不做」项均遵守 ✓：review-rules 与 agents/ 不迁移、LCR 行删除、organic 产物仅声明、README 定位段 ≤10 行、无哲学长文
- **处置清单完备性（H1 已消）**：实测仓根 8 条目全部在册（`index.json`、`package.json` 已补）；`specpipe/` 下 5 项（SKILL.md / config.md / quality-gate.md / git-branch-guide.md / review-rules 21 项）与 `agents/`（5 文件）均在册 ✓
- 计数声明实测：`index.json` files 数组实为 **25** 条路径（impl 称 26，见问题 4）；review-rules 实为 21 项（20 `.md` + `system_rules.json`），impl 已改 21 ✓（注：spec L36 仍写「review-rules（22 文件）」，为 spec 侧笔误，非 impl 缺陷）

### 3. 改动点核查 — 行号对「全局副本」全部命中，对「改造目标仓」系统性偏移（high）

以语义为准，对 **全局副本（708 行）** 抽查：A1 触发 L25-30 / 需求分级 L32-42 / 放行 L108 / impl 唯一事实源 L313；A2 三路径图 L44-59 / S0 L65-80 / S1 L82-88 / S2 L90-108 / 放行 L110-119；A3 Story L206-318；A4 Epic L122-203；A5 Issue L321-389；B1 产出表 L673-686（12 行）/ N 计数 L692 / 行号规范 L270 / topic 规则 L694-698 / AGENTS.md 三层记忆 L653；B2 状态链 L497-509 / 分工 L511 / 转移表 L515-521（五行）/ 状态规则 L523-533（**实测 10 条 bullet** ✓）/ 中断恢复 L535-552（七类恢复点 + 残留处置 + 恢复前提）；B3 epic-spec L141-159 / spec L226-240 / impl L262-268 / issue-impl L339-352（8 段）；C1 角色表 L560-566 / 定位 5 条 L568-573 / 任务书 L577-587 / 调度协议 L589-632 / 检索工具 L636-644；C3 L392-459 / L700-704 —— **均命中且语义吻合** ✓

**但对本地克隆（= 改造目标仓 `origin/main`，700 行）系统性偏移**（见问题 1）：

| 锚点 | 全局副本(708) | 仓内副本(700) | 偏移 |
|---|---|---|---|
| `## 触发` / `## 需求分级` / `### S0 调研` / `### 用户放行机制` / `## Epic 路径` / `### Epic 进度推进` | 25 / 32 / 65 / 110 / 122 / 185 | 同左 | 0 |
| 「无依赖 Story 可并行」段 | 189 | **不存在** | — |
| `## Story 路径` | 206 | 204 | +2 |
| `## Issue 路径` | 321 | 316 | +5 |
| `## 质量门环节` / `## 状态机` / 转移表表头 / `### 中断恢复` | 461 / 492 / 515 / 535 | 454 / 485 / 508 / 528 | +7 |
| `## 关键规则` / `## 文件产出` / `## Git 分支策略` | 648 / 671 / 700 | 640 / 663 / 692 | +8 |

受影响条目（举例）：A3 `L206-318`→仓内 204-316；A5 `L321-389`→316-384；B1 `L673-686`→665-678、`L692`→684、`L694-698`→686-690、`L653`→645；B2 `L497-509`→490-502、`L515-521`→508-514、`L523-533`→516-526、`L535-552`→528-545；B3 spec/impl/issue-impl 模板各 -2/-5；C1 角色表 `L560-566`→553-559、调度协议 `L589-632`→582-625、检索工具 `L636-644`→627-636；C3 `L392-459`→388-453、`L700-704`→692-696。

内容级分叉（非仅行号）：① 全局 L189 有「无依赖 Story 可并行（可选）」段、关键规则 7（L656）含「无依赖且文件集不相交的 Story 经用户确认后可并行推进」，**仓内均无**；② 全局检索工具为三 CLI（`tvly`/`exa`/`c7`，L634-644）、config.md 为「外部调研工具（CLI）」，**仓内为两 MCP**（`websearch`/`context7`，SKILL.md L627-636、config.md L28-35）。故 A4「并行 Story 条件」、C1「三 CLI 职责表」、A1「检索工具三 CLI 抽象名」所引内容在仓内 v1 中不存在。

其余改动点小项：`{topic}` 取值规则（L694-698）、质量门后台会话（L480-486）、`{wf}` 路径与分卷加载（L18-19 / L23）三处补落位均已到位 ✓；「原样」条目经新定义（L29）消解了角色名冲突 ✓；rev1 命中的 `最小验证 L582-584` 行号越界已通过删去行号消解 ✓。

### 4. 隐藏依赖 — `checker.md` 已声明；残余 v1 源双副本未声明

- 已声明 ✓：GitHub push 权限（分支级）、v1 源 read 访问（SKILL.md / config.md / docs/ 两文件 + `agents/checker.md`）、本地克隆（fetch + 基于 `origin/main` 拉分支）、review-rules 仅确认存在不读内容
- **未声明（high，问题 1）**：v1 源存在**两个内容分叉的副本**（全局 708 行 / 仓内 700 行），impl 未声明以何者为准、也未声明仓内副本将被替换；依赖节只列全局路径，而处置清单写「删除 `specpipe/SKILL.md`（内容提炼入 01~10（按落位表））」——「被删文件的内容」与「落位表所依据的内容」不是同一份
- 小项（low，问题 6）：`.gitignore` 声明「原样」保留，但 `node_modules/` 在 `package.json` 删除后成为无主条目，未说明去留（rev1 L15 遗留）

### 5. 风险与兜底 — 对照表机制可执行但未闭环

- 风险识别齐备 ✓：语义漂移 / 平台词泄漏 / 三块并行风格漂移 / index.json 死链（外部安装），与 spec 关键风险对应
- **Builder 端可执行性 ✓**：无状态 Builder 可产出对照表——任务书自带共用约定全文 + 该块改动点全文 + v1 源绝对路径清单（L24），改动点标注的 v1 源区间 + 可 read 的源文件足以支撑「v1 源条目 → 新卷条目」逐行对照
- **残余缺口（medium，问题 2）**：① 对照表附于 Builder 报告（stdout，不落盘），Oracle 汇总为「核查底稿」但底稿无落盘位置；质量门时的 Checker 是无状态代理，看不到 Oracle 上下文——底稿如何进入 Checker 任务书未声明；② 独立复核仅「抽查」，而本 Story 首要风险是「行为面冻结」，抽查强度与风险不匹配；③ 纯文档仓无编译/测试，质量门 7 项（编译 / fence / 测试覆盖 / 代码质量 OCR）如何处置未定义，等价核对亦未形成可执行检查清单（15 条落位表未明确作为该清单）

### 6. 回归面 — `skills.urls` 声明充分；残余低项

- 已声明 ✓：本地 v1 skill 不动、dev 分支不碰 main、原址改造保留 git 历史、LICENSE/.gitignore 原样保留、`skills.urls` 安装面影响（README 交接说明 + Story 4 统一切换）、既有本地克隆处置（fetch + 基于 `origin/main` 拉分支，不复用工作区状态）
- 分支假设核实无误 ✓：仓默认分支 `main`（`git status` 报 `## main`），`origin/main` = 本地 main = `6dbaadb`，impl「基于 `origin/main`」准确
- 小项（low，问题 7）：「当前本仓唯一安装者是用户本人」为未证实判断（仓为公开仓，rev1 已指出现 README 推荐 `skills.urls` 安装）

## 发现的问题

1. **v1 源基线与改造目标仓内容不一致（双源分叉），行号引用与内容落位失准** — 严重程度：**high**
   - 影响：本地克隆（= GitHub `origin/main`，`6dbaadb`，工作区干净）的 `specpipe/SKILL.md` 为 **700 行**，而 impl/spec 采用的全局副本 `~/.config/opencode/skills/specpipe/SKILL.md` 为 **708 行**。两者内容分叉：全局含「无依赖 Story 可并行」段（L189）与关键规则 7 的并行条款（L656）、检索工具为三 CLI（`tvly`/`exa`/`c7`）、config.md 为「外部调研工具（CLI）」；仓内无并行 Story 段、检索工具为两 MCP（`websearch`/`context7`）。后果有三：① impl 改动点的全部行号（Story 路径 +2、Issue 路径 +5、质量门/状态机 +7、关键规则/文件产出 +8）只对全局副本成立，Builder 在 worktree 中打开 `specpipe/SKILL.md` 按行号取料会取到**错误内容**；② A4「并行 Story 条件」、C1「三 CLI 职责表」、A1「检索工具三 CLI 抽象名」所引内容在**仓内 v1 中不存在**，Builder 无从迁移，只能 BLOCKED 或自行判断；③「01~10 与 v1 SKILL.md 语义等价」的**基准不明确**（对全局还是对仓内？），本 Story 首要风险（语义漂移）的对照基线悬空；④ spec 前提「现 GitHub 仓 jiaozhousa/SpecPipe 为 v1 形态（SKILL.md 708 行）」与仓内实际（700 行）不符，该事实错误已传入 impl
   - 建议：二选一并写入 impl——①**声明以全局副本为唯一 v1 基准**，并显式说明「仓内 `specpipe/` 为旧版（MCP/无并行 Story），改造即以其替换」，同时把 708 行基准文件**内容**（而非仅路径）纳入任务书或先同步仓内文件，避免 Builder 误读；②或先对齐仓库（将全局 v1 提交/推送使 `origin/main` 与基准一致）后再拉分支。无论哪种，须在改动点中逐处标注行号所依据的副本，并复核 A4/C1/A1 所引内容在基准中的实际存在性

2. **语义等价验证机制未闭环（H3 残项）** — 严重程度：**medium**
   - 影响：逐项对照表虽已引入，但 ① 对照表附于 Builder stdout 报告（v1 约定 Builder 不写文件），Oracle 汇总的「语义等价核查底稿」无落盘位置，质量门时的 Checker 为无状态代理、看不到 Oracle 上下文，底稿如何进入其任务书未声明；② 独立复核仅「抽查」，对「行为面冻结」这一首要风险强度不足（rev1 建议为「逐条核对」）；③ 本 Story 无编译/测试，质量门 7 项清单（编译 / fence / 测试覆盖 / 代码质量 OCR / impl 一致性）如何适用未定义，等价核对亦未与 15 条落位表绑定为可执行清单
   - 建议：① 明确底稿落盘位置（如 `{wf}/plans/{topic}/` 下的一页对照文件，或直接作为质量门审查的基准材料随任务书传入）；② 将复核由「抽查」升为「按卷逐条核对」（可派发 Checker、以基准 v1 为材料，结论作为 DONE 前置）；③ 明确纯文档仓下质量门各项的适用/跳过规则，并把「关键规则 15 条落位表」指定为该核对的检查清单

3. **术语对照表 `Builder → 执行者` 与 v1 三处实指调度者的用法冲突，且与 `.stage-history` actor 定义矛盾** — 严重程度：**medium**
   - 影响：v1 在「文件产出」表写入者列（L673-686：spec/impl/epic-spec/issue-impl 写作 `Builder`）、状态更新职责分工（L511「Builder 负责流程推进（DRAFT 创建、`*_REVIEWING` 标记、用户放行后 `*_APPROVED`、`DONE`）」）、Checker 状态转移表表头（L515「审查前状态（Builder 设置）」）三处的 `Builder` 实指 Oracle（调度者）——v1 L562 明确 spec/impl 由 Oracle 产出，L565 明确 Builder 只按 impl 编码。对照表将 `Builder` 一律映射为「执行者」，会使 06-artifacts（epic-spec 业务规则 4 的「文件布局即 IPC」权威卷）与 07-state-machine（业务规则 2 的转移表唯一事实源）产出**错误的产出者/设置者**，并与 impl 自己新增的 `.stage-history` actor ∈ {调度者, 审查者}（L100）直接矛盾，存在向 B 仓契约传播的风险
   - 建议：在对照表加注「v1 的 `Builder` 在产出表写入者列 / 状态分工 / 转移表表头三处实指调度者」，或对这三处逐处标注目标术语；并让 06/07 的产出者、actor 取值与对照表统一

4. **`index.json` 路径计数错误** — 严重程度：**low**
   - 影响：impl 称「列 26 个改造后消失的路径」，实测 `files` 数组为 **25** 条（SKILL.md、config.md、docs/quality-gate.md、docs/git-branch-guide.md + review-rules 21 项）。计数是 Builder 处置核对的自查锚点
   - 建议：改为 25（或删去具体数字，写「列全部 v1 文件路径」）

5. **B3 对 `checker.md` L124-158 的描述不精确** — 严重程度：**low**
   - 影响：实测该区间两套格式为「普通审查（Spec / Impl / Issue Impl）」（L126-138）与「质量门全面审查」（L140-158），而非「轻量 / 完整」；「stdout 约定」并不在 L124-158（在 SKILL.md 调用模板 L176 与 `checker.md` 状态转移节）。B3 以此两套格式作为五类报告模板的格式权威来源，其中 Epic Spec 报告格式未被该区间显式命名（需由 SKILL.md L169 行数约束补充）
   - 建议：改为「普通审查（覆盖 Spec/Impl/Issue Impl）+ 质量门两套格式」，并注明 Epic Spec 报告格式由 v1 各审查节的行数约束补充

6. **`.gitignore` 保留「原样」未说明 `node_modules/` 去留** — 严重程度：**low**
   - 影响：`.gitignore` 含 `node_modules/` / `.specpipe/` / `.env`；`package.json` 删除后 `node_modules/` 成为无主条目，与「纯规章仓」定位不符，且未说明理由（rev1 L15 遗留）
   - 建议：在处置清单注明 `.gitignore` 是否同步精简（如删 `node_modules/`），或声明「保留原样、理由 X」

7. **回归面「唯一安装者」判断未证实；禁词表/引用声明小项** — 严重程度：**low**
   - 影响：① L12「当前本仓唯一安装者是用户本人」为未证实判断（仓公开）；② 禁词表未含 `subagent`（对照表已映射为「下级代理」，grep 会放过）、`~/.local/share`，且 `opencode` 大小写敏感性未声明（README 须写 `OpenCodePipe`）；③ A4 未声明删除 E-S5 调用模板段（v1 L171-178）、A3 未声明 fence 编排与 10-composition 的引用关系；C2 检查分流表未补精确来源（epic-spec 业务规则 5）、B1 未列各工件行数上限具体值（rev1 #12/#13/#16 残项）
   - 建议：① 改为「已知并接受外部安装断裂」或删去唯一性断言；② 禁词表补 `subagent`/`~/.local/share` 并声明大小写策略；③ 补 A3/A4 处置声明、C2 来源、B1 行数上限数值

## 结论

# REJECT

状态：IMPL_REVIEWING → IMPL_DRAFT

> 复审建议：问题 1（v1 源双副本分叉——须明确基准并复核受影响落位）为必改项；问题 2（等价核对落盘与逐条化、质量门适用性）与问题 3（Builder→调度者术语冲突）建议一并修订；问题 4~7（low）可随改。
