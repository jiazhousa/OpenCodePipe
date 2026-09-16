# 审查报告: specpipe-v2-s1-rules (Revision 3)

## 总体评价

**通过**

rev 3 对 impl-revision-2 的 1 high + 2 medium 修复**方向正确且经独立实测验证落实**，无残留 high/critical：

- **H1（双源分叉）已消，且修复方式经独立核验为真**：impl 总体策略步骤 2 新增「基线同步（首个 commit）」，声明 5 个分叉文件（`specpipe/SKILL.md`、`specpipe/config.md`、`agents/checker.md`、`agents/explorer.md`、`agents/oracle.md`）以全局副本覆盖，v1 内容基线权威源 = 全局副本，全部行号锚定 708 行版。本轮以 `git diff --no-index` 对 10 个候选文件逐一实测，**分叉清单精确无遗漏也无多报**（见下「改动点核查」表）；`origin/main = 6dbaadb` 与 impl L10 一致。
- **rev2 medium #2 的 ①（底稿无落盘/传递）与 ③（纯文档仓质量门适用性）已消**：等价底稿落盘 `{wf}/plans/specpipe-v2-s1-rules/equivalence-check.md`，质量门 Checker 经任务书附路径 read 获取（无状态代理可执行的闭环）；质量门 7 项在纯文档仓下的替换规则逐项声明（第 4/5 项 → 机械校验、第 6 项 → 语义等价抽核、其余四项照常），覆盖完整无遗漏项。
- **rev2 medium #3（术语对照表 `Builder → 执行者` 与 v1 三处实指调度者冲突）已消**：对照表行内加注 + L32 修正注 + B2 L103 逐处标注，且与 `.stage-history` actor ∈ {调度者, 审查者} 的取值自洽。
- rev2 的 6 项 low 中：index.json 计数 25（实测 `files` 数组 25 条 ✓）、checker.md 描述加「以实际内容语义定位为准」、`.gitignore` 由「原样」改「保留+核查」、安装者断言弱化为「据用户自述」均已落实；余下 low 为措辞/清单完备性的微项（见「发现的问题」）。

**关键判据（改动点核查）**：本轮逐条复核 impl 全部 v1 行号锚点对**708 行全局副本**的命中情况——A1（L25-30 / L32-42 / L108 / L313 / L18-19 / L23）、A2（L44-59 / L65-80 / L82-88 / L90-108 / L110-119）、A3（L206-318）、A4（L122-203）、A5（L321-389）、B1（L673-686 / L692 / L270 / L694-698 / L653）、B2（L497-509 / L511 / L515-521 / L523-533 / L535-552）、B3（L141-159 / L226-240 / L262-268 / L339-352）、C1（L560-566 / L568-573 / L577-587 / L589-632 / L636-644）、C2（L165-168 / L248-252 / L280-287 / L362 / L469-476）、C3（L392-459 / L700-704）——**全部命中且语义吻合**，含 v1 内容级事实（关键规则 15 条在 L650-669、状态规则 10 条 bullet、中断恢复 7 类恢复点、Epic 并行 Story 段 L189、三 CLI 表 L638-642）均真实存在于 708 行版。

**残余风险（不阻塞，建议在质量门任务书中收紧，见问题 1）**：语义等价复核仍为「逐卷抽核」而非 rev2 建议的「逐条核对」，且未显式声明 Checker 任务书附 v1 基准（708 行版）路径。本 Story 首要风险为「行为面冻结」，该残余属复核**强度**问题而非机制缺失（底稿已落盘、映射已逐条、15 条落位表可作清单、M1 用户终审为兜底），故判为 medium 但**不构成 REJECT**——修复可在质量门派发时以任务书一句话补齐，无需回退 impl。

审查材料：impl.md（rev3，134 行）、spec.md（53 行）、epic-spec.md（87 行）、impl-revision-2 报告、v1 全局副本（`SKILL.md` 708 行逐行核对 / `config.md` 53 行 / `docs/quality-gate.md` / `docs/git-branch-guide.md`）、`~/.config/opencode/agents/checker.md`（172 行全文）、本地克隆 `/home/starlex/project/SpecPipe`（`main`，HEAD = `origin/main` = `6dbaadb`，工作区干净；仓根 8 条目、`agents/` 5 文件、`specpipe/docs/review-rules/` 21 文件逐项实测；10 个 v1 候选文件两两 `git diff --no-index` 实测分叉）。

## 逐项结论

### 1. 术语一致性 — 对照表自洽，v1「Builder」实指修正到位

- 角色名（调度者 / 调研者 / 审查者 / 执行者 / 视觉解析者）、工件名（epic-spec / spec / impl / issue-impl / 五类审查报告 / AGENTS.md 三层记忆）、状态名与 `.stage-history` 字段（ts/topic/from/to/actor）、卷名与 spec 一致 ✓
- 术语对照表（L34-41）新增行内注 + L32 修正注：明确 v1「Builder」在状态机分工 / 文件产出表 / 放行后置 APPROVED 三处**实指调度者**，v2 按实际职责映射为调度者，仅编码执行语境保留「执行者」；B2 L103 在「状态更新职责分工（L511）」处再次逐处标注 ✓。与 `.stage-history` actor ∈ {调度者, 审查者}（L103）**不再矛盾** ✓
- 与禁词表无直接冲突；「保留英文原文」清单（`.stage` / `.stage-history` / `{wf}` / `plans/` / `reviews/` / `spec.md` / `impl.md` / `worktree` / `fence` / `topic`）合理 ✓
- 残留小项：禁词表（L50）仍缺 `subagent`（对照表已映射为「下级代理」，故 grep 自验会放过该词）、`~/.local/share`；`opencode` 大小写敏感性未声明（README 须写 `OpenCodePipe`，`grep -i` 会误命中）——见问题 3

### 2. 范围对齐 — 12 类交付全覆盖，处置清单完备且与实测仓根一致

- 交付集合：README（A6）+ 01~10（A1~A5/B1~B3/C1~C3）+ `templates/`（9 文件）= 12 类，与 spec L17-28 一致；三块文件集互不相交（A: README+01~05 / B: 06+07+templates / C: 08~10）✓
- spec「不做」项均遵守 ✓：review-rules 与 `agents/` 不迁移、LCR 行删除（落位表 #15 标「废弃」，与 spec L29 裁决一致）、organic 产物仅声明、README 定位段 ≤10 行、无哲学长文
- 处置清单完备性：实测仓根 8 条目（`.gitignore` / `LICENSE` / `README.md` / `index.json` / `package.json` / `agents/` / `specpipe/` + `.git`）全部在册；`specpipe/` 下 5 项（SKILL.md / config.md / quality-gate.md / git-branch-guide.md / review-rules 21 项）与 `agents/`（checker/looker/oracle/builder/explorer 5 文件）均在册 ✓
- 计数声明实测：`index.json` `files` 数组 **25** 条（impl L84 称 25 ✓）；review-rules **21** 项（20 `.md` + `system_rules.json`，impl 称 21 ✓）
- 备注（spec 侧笔误，非 impl 缺陷）：spec L36「review-rules（22 文件）」与实测 21 不符

### 3. 改动点核查 — 行号锚点对 708 行版全部命中；分叉清单实测精确

**基线同步清单实测**（`git diff --no-index`，以仓内副本为基准、全局副本为对照）：

| v1 候选文件 | 实测差异 | impl 分叉清单 | 结论 |
|---|---|---|---|
| `specpipe/SKILL.md` | 700 vs 708 行（仓内缺「并行 Story」段、检索工具为两 MCP） | 在册 | ✓ |
| `specpipe/config.md` | 12 insert / 13 delete（MCP 组 → 三 CLI 组，模型/provider 段更新） | 在册 | ✓ |
| `agents/checker.md` | 2 delete（全局多 `**/.specpipe/**` 递归白名单 2 行） | 在册 | ✓ |
| `agents/explorer.md` | 5 insert / 13 delete（bash 由 deny → tvly/exa/c7 白名单；两 MCP → 三 CLI） | 在册 | ✓ |
| `agents/oracle.md` | 1 行（`variant: max` → `high`） | 在册 | ✓ |
| `agents/builder.md` | **无差异** | 未列 | ✓ 正确 |
| `agents/looker.md` | **无差异** | 未列 | ✓ 正确 |
| `specpipe/docs/quality-gate.md` | **无差异** | 未列 | ✓ 正确 |
| `specpipe/docs/git-branch-guide.md` | **无差异** | 未列 | ✓ 正确 |

即：**「5 文件分叉」既不漏报也不多报**，rev2 的 H1 事实基础被完全固化为可核验清单。

**行号锚点抽查（对 708 行全局副本，语义为准）**：A1 触发 L25-30 / 需求分级 L32-42 / 放行不自动推进 L108 / impl 唯一事实源 L313 / `{wf}` L18-19 / 分卷加载 L23；A2 三路径图 L44-59 / S0 L65-80 / S1 L82-88 / S2 L90-108 / 放行 L110-119；A3 Story L206-318（含 S-S9 七步）；A4 Epic L122-203（含并行 Story 段 L189）；A5 Issue L321-389；B1 产出表 L673-686 / N 计数 L692 / 行号规范 L270 / topic 规则 L694-698 / 三层记忆 L653；B2 状态链 L497-509 / 分工 L511 / 转移表 L515-521（五行）/ 状态规则 L523-533（10 条 bullet）/ 中断恢复 L535-552（7 类恢复点）；B3 epic-spec L141-159 / spec L226-240 / impl L262-268 / issue-impl L339-352；C1 角色表 L560-566 / 定位 L568-573 / 任务书 L577-587 / 调度协议 L589-632 / 检索工具 L636-644；C2 清单 L165-168 / L248-252 / L280-287 / L362 / L469-476；C3 L392-459 / L700-704 —— **全部命中** ✓

其余改动点小项：`{topic}` 取值（L694-698）、质量门后台会话（L480-486）、`{wf}` 与分卷加载（L18-19 / L23）补落位到位 ✓；「原样迁移」新定义（L31）消解角色名机械转换冲突 ✓

### 4. 隐藏依赖 — 分叉副本已显式声明；残余小项

- 已声明 ✓：本地克隆（fetch + 基于 `origin/main` 拉分支，实测 `origin/main` = `6dbaadb`）、GitHub push 权限（分支级）、v1 内容基线权威源 = 全局副本（L123 列全 4 条路径 + `agents/checker.md`）、review-rules 仅确认存在（21 文件）不读内容、**5 分叉文件清单**（L11 / L123）
- rev2 指出的「两个内容分叉副本未声明以何者为准」已消：L11 明确「v1 内容基线权威源 = 全局副本」+「首个 commit 覆盖至分支」+「全部 v1 行号以同步后的 708 行版为准」，且 L11 如实记载仓内现状（700 行 MCP 版）✓
- 小项：全局 `config.md` 含作者个人模型/provider 配置，基线同步 commit 会将其推至公开仓（随后删除）——属可接受的原址改造行为，非缺陷

### 5. 风险与兜底 — 等价验证机制已可执行闭环；强度残余一项

- 风险识别齐备 ✓：双源分叉 / 语义漂移 / 平台词泄漏 / 三块并行风格漂移 / index.json 死链，与 spec 关键风险一一对应；双源分叉的缓解列明「基线同步 commit 先行 + diff 清单已实测固化」✓
- Builder 端可执行性 ✓：任务书自带共用约定 + 该块改动点 + v1 源绝对路径清单（L26），逐项对照表可产出
- 等价底稿落盘与传递 ✓：`{wf}/plans/specpipe-v2-s1-rules/equivalence-check.md`，质量门 Checker 经任务书附路径 read 获取（L18 / L115）
- 质量门纯文档仓适配 ✓：第 4/5 项 → 机械校验（禁词全仓扫描 / 交叉引用完整性 / 行数预算核对）；第 6 项 → 语义等价抽核；其余四项（impl 一致性 / 第 2 项 / commit 信息 / 文档归档）照常；`无编译 / 测试` 明示 ✓
- **强度残余（medium，问题 1）**：复核仍为「逐卷抽核」，未按 rev2 建议升为「逐条核对」，且未显式声明 Checker 任务书附 v1 基准路径（「对照 equivalence-check.md 逐卷抽核 v1 源条目」隐含需读 v1，但未明写）

### 6. 回归面 — 影响面声明充分

- 已声明 ✓：本地 v1 skill 运行环境（`~/.config/opencode/skills/specpipe/`）不动；改造期间 `main` 不变、`skills.urls` 安装源不受影响；合并后本仓不再是可独立安装的 skill 源（实测 README L42-50 的 `skills.urls` 指向 `raw.githubusercontent.com/jiazhousa/SpecPipe/main`），README 交接说明承接 + Story 4 统一切换；LICENSE 保留；`.gitignore` 保留+核查；原址改造保留 git 历史
- 分支假设核实无误 ✓：仓默认分支 `main`、工作区干净、`origin/main` = 本地 HEAD = `6dbaadb`，impl「基于 `origin/main`」准确（注：本仓无 `develop`，与 config 默认 `main_branch=develop` 的差异属该仓自身事实，impl 处理正确）
- rev2 low #7①（唯一安装者断言）已弱化为「据用户自述」✓

## 发现的问题

1. **语义等价复核强度与基准传递仍偏弱** — 严重程度：**medium**
   - 影响：本 Story 首要风险是「行为面冻结（语义等价）」，rev2 已指出复核机制未闭环并建议升为「逐条核对、以基准 v1 为材料、结论作 DONE 前置」。rev3 补齐了落盘与可执行性（底稿路径 + 质量门任务书附路径），但 ① 复核仍为「逐卷抽核」，对「全部源自 v1 的内容」未要求逐条覆盖；② 质量门任务书仅声明附 `equivalence-check.md`（Oracle 汇总的自报底稿），未显式声明附 **v1 基准（708 行版）路径**——若无 v1 原文，Checker 只能对照底稿自查，独立性不足（底稿本身即由被审内容产出方汇总）。若发生系统性弱化（如某卷条件被整体省略），抽核可能漏过
   - 建议（无需回退 impl，可在质量门派发任务书时补齐）：① 明确 Checker 任务书附 v1 基准材料路径（708 行版 `SKILL.md` + `config.md` + `docs/` 两文件），底稿仅作索引；② 将「关键规则 15 条落位表（L54-70）」与各卷 v1 源区间指定为核对清单，逐卷逐条核对；③ 结论作为 `DONE` 前置（与 fence 汇合点同级的双 PASS 语义）

2. **B3 对 `checker.md` 报告格式的描述仍不精确** — 严重程度：**low**
   - 影响：L104 仍写「轻量 / 完整等分套结构」，实测 `checker.md` L124-158 的两套格式为「**普通审查（Spec / Impl / Issue Impl）**」（L126-138）与「**质量门全面审查**」（L140-158），并非「轻量 / 完整」；且 Epic Spec 报告格式未被该区间显式命名（须由 v1 SKILL.md L169 行数约束 ≤40 行补充）。rev3 已加「以实际内容语义定位为准」缓解，但误标仍会误导模板骨架命名
   - 建议：改为「普通审查（覆盖 Spec / Impl / Issue Impl）+ 质量门两套格式」，并注明 Epic Spec 报告格式由 v1 L169 行数约束补充（普通审查格式 + ≤40 行）

3. **禁词表仍缺 `subagent` / `~/.local/share`，未声明大小写策略** — 严重程度：**low**
   - 影响：对照表（L37）已将 `subagent` 映射为「下级代理」，即该词不应出现在 v2 正文，但禁词表（L50）未列——「命中即违规」的 grep 自验会放过该词（v1 中 `subagent` 高频出现，机械转换遗漏风险实在）；`~/.local/share` 亦缺（v1 worktree 路径前缀）。另 README 须写 `OpenCodePipe`（含小写子串 `pencode`，不含 `opencode`，但 `grep -i` 会误命中）与 `opencode` 禁词的关系未声明大小写策略
   - 建议：禁词表补 `subagent`、`~/.local/share`；声明「平台词扫描区分大小写，`OpenCodePipe` 为白名单例外」

4. **03 与 10 的 fence 编排边界未划清，与自订引用规则存在张力** — 严重程度：**low**
   - 影响：A3（L95）称 03-story-path 含「fence 后台化与汇合点 / 增量重跑」，C3（L110）又称 10-composition 含「fence 编排（S-S9 步骤 5/7…）」，两卷内容重叠；而共用约定 L44 明确「不反向引用流程细节（避免环路）」——C3 以「S-S9 步骤 5/7」为内容源，若在 10 中落地为对 03 的引用即构成反向引用。spec L20/L27 亦把 fence 编排同时分配给 03 与 10，故为继承性缺口
   - 建议：明确「03 保留 S-S9 步骤序号与流程位次，fence 的并行/汇合/增量重跑**规则本体**定义于 10，03 以相对路径引用 10」；或反向，但须择一，避免双写与环路

5. **Builder 输入闭合性清单未含禁词表与 15 条落位表** — 严重程度：**low**
   - 影响：L26 声明任务书自带「① 共用约定与术语对照表全文；② 该块改动点全文；③ v1 源文件绝对路径清单」，而 L114 要求 Builder 块内自验「② 禁词表 grep 零命中」——禁词表（L48-50）既非共用约定、亦非改动点，按闭合性清单不会随任务书传入，Builder 无法执行该项自验；同理 15 条落位表（L54-70）是各块内容映射的核对依据，亦未列入
   - 建议：闭合性清单补「禁词表全文 + 关键规则 15 条落位表全文（或说明其由 v1 L650-669 现读）」

6. **其他措辞小项** — 严重程度：**low**
   - A3 标称「Story 七环节（L206-318 语义原样：S-S3~S-S10）」，但 S-S10（质量门）正文实际位于 L461-488，不在 L206-318 区间内（区间内为 S-S3~S-S9 共 7 个 `###` 标题）——建议标注「S-S10 内容源为 L461-488，与 09/10 协同落位」
   - A4 未声明删除 E-S5 的 Checker 调用模板段（v1 L171-178，含 `task`/`subagent_type` 平台语法），而 A2 对 S0 调用模板（L73-80）有「删，归 08」声明——建议补同款声明
   - C2 检查分流表未补精确来源（epic-spec 业务规则 5「检查分流」）
   - B1 未列各工件行数上限具体值（epic-spec ≤500 / spec ≤300 / impl 未定 / issue-impl ≤80 / 审查报告 ≤40 与 ≤30 等），仅说明「每工件一节含行数上限」
   - 质量门适配中第 2 项（代码质量 OCR 流水线）被表述为「报告质量」，措辞不准（纯文档仓下该项应为「文档质量/规范一致性审查」，或明示 OCR 流水线不适用）

## 结论

# PASS

状态：IMPL_REVIEWING → IMPL_APPROVED

> 复审说明：rev2 的 1 high（双源分叉）已按「基线同步 commit + 权威源声明 + 708 行锚定」消解，且 5 文件分叉清单经 `git diff --no-index` 独立实测精确无误；2 项 medium 中「底稿落盘/传递」与「纯文档仓质量门适用性」已消，「Builder→调度者」术语冲突已消。余 1 项 medium（问题 1，语义等价复核强度与 v1 基准传递）与 5 项 low 均为可在质量门派发阶段或 Builder 块内顺手补齐的微项，不构成 REJECT。**建议 Oracle 在派发质量门 Checker 时把 v1 基准路径与 15 条落位表写入任务书**（问题 1 的建议），即可将本 Story 首要风险的复核强度补齐。
