# 审查报告: specpipe-v2-s1-rules (Revision 1)

## 总体评价

**不通过**

impl 的技术路线（原址改造 / 三块并行 / 共用约定 / 平台无关词表）与 spec、epic-spec 的方向一致，v1 源行号抽查绝大部分真实且匹配（详见逐项结论 3），「原样迁移」条目在 v1 中均存在。但存在 3 项 high 级问题——**仓内文件处置清单不完整（漏 `index.json`/`package.json`，且 index.json 会因改造变成引用断裂的死清单）**、**五类审查报告模板的来源声明不实且依赖未声明（格式实际定义在不迁移的 `agents/checker.md`）**、**本 Story 首要风险「语义等价」在计划中无实际验证环节**——均会直接影响成稿正确性或后续 B 仓契约一致性。另有 8 项 medium、5 项 low 需一并修订。

审查材料：spec.md、epic-spec.md、v1 SKILL.md（708 行）、config.md、docs/quality-gate.md、docs/git-branch-guide.md，并对 GitHub 仓 `jiazhousa/SpecPipe` 的本地克隆 `/home/starlex/project/SpecPipe`（main，HEAD `6dbaadb`，工作区干净）做了实地核对。

## 逐项结论

### 1. 术语一致性 — 基本对齐，2 处冲突

- 卷名（README / 01-general ~ 10-composition / templates/）、工件名（epic-spec / spec / impl / issue-impl / 五类审查报告 / AGENTS.md 三层记忆）、状态名与 `.stage-history` 字段（ts/topic/from/to/actor）均与 spec 一致 ✓
- 角色名与 spec 的「调度者 / 调研者 / 审查者 / 执行者 / 视觉解析者」一致，共用约定已规定中文名 ✓
- **冲突 1（medium）**：impl 多处标注「原样」的条目内含英文角色名，与共用约定「角色名用中文」直接矛盾（见 M2）
- **冲突 2（low）**：impl 自身叙述混用 v1 英文角色名（Oracle/Builder/Checker）与 v2 中文名，读者需自行映射；建议在改动点描述目标内容时统一用 v2 中文名（引用 v1 源时保留英文）

### 2. 范围对齐 — 12 类交付覆盖，但有遗漏块与越界风险

- 交付集合覆盖 ✓：README（A6）+ 01~10（A1~A5/B1~B3/C1~C3）+ templates/（9 文件），与 spec「README+01~10+templates 共 12 类文件」一致；三块文件集互不相交（A: README+01~05 / B: 06+07+templates / C: 08~10），无重叠、无遗漏 ✓
- spec「不做」项均遵守 ✓：review-rules 与 agents/ 不迁移、LCR 行删除、organic 产物仅一句话声明、README 定位段 ≤10 行、无哲学长文
- **遗漏（high H1）**：仓根 `index.json`、`package.json` 未纳入处置清单，而 impl 自称该清单是「改造全貌」
- **遗漏（medium M5）**：v1 中 3 处内容块无落位（`{topic}` 取值规则、质量门 tmux 长时检查、路径约定/按需加载机制）
- **验证缺口（high H3）**：spec 审查基准（01~10 与 v1 语义等价、关键规则 15 条逐条落位）在 impl 中无对应验证步骤

### 3. 改动点核查 — 行号抽查全部命中；「原样」条目均真实存在；计数类声明有误

逐项核对结果（以语义为准）：

| impl 声明 | v1 实测 | 结论 |
|---|---|---|
| A2 公共环节：S0 L65-80 / S1 L82-88 / S2 L90-108 / 放行 L110-119 | 各节起始行完全吻合；L108 = "此环节阻塞，Oracle 不自动推进" | ✓ |
| A1 需求分级表 L32-42、触发 L25-30、放行 L108、impl 唯一事实源 L313、最小验证 L582-584 | L32 "## 需求分级"…L42 判定说明；L25 "## 触发"；L313 "impl.md 是唯一事实源" 均在位（L582-584 略越界，见 L3） | ✓ |
| A3 Story 路径 L206-318（七环节 / S-S5 2 项 / S-S8 6 项 / S-S9 7 步） | L206 "## Story 路径"…L317；2 项 = L250-251；6 项 = L282-287；S-S9 步骤 1~7 = L299/300/301/305/306/307/308 | ✓ |
| A4 Epic 路径 L122-203（E-S5 轻量 3 项 / 并行 Story / Epic 下 S2 确认性判定 / 终检三校验） | L122 "## Epic 路径"…L202；3 项 = L165-167；并行 = L189；确认性判定 = L191；终检 = L195-198 | ✓ |
| A5 Issue 路径 L321-389（I-S5 精简 / 升级机制 4 步） | L321 "## Issue 路径"…L389；I-S5 = L360-362；升级 4 步 = L384-387 | ✓ |
| B2 三路径状态链 L497-509「原样」 | L497-509 三条状态链齐备 | ✓ |
| B2 转移表 L515-521「五行表原样」 | L515 表头 + L517-521 五行（Epic/Spec/Impl/Issue Impl/全面审查） | ✓ 存在（角色名冲突见 M2） |
| B1 产出表 L673-686「十二行表」 | L673-686 恰为 12 行 | ✓ |
| B1 AGENTS.md 三层记忆 L653「原样」、N 计数 L692、行号规范 L270 | L653 / L692 / L270 内容均吻合 | ✓ 存在（平台词冲突见 M1） |
| B3 epic-spec-template L141-159 / spec-template L226-240 / impl-template L262-268 / issue-impl-template L339-352「八段」 | L140-145+151-159、L226-230+236-240、L264-268、L340-352（恰 8 段） | ✓ |
| C1 角色表 L560-566 五行、定位 5 条 L568-573、任务书 L577-587、调度协议 L589-632、检索工具 L636-644 | 逐项吻合（角色表 5 行、定位 5 bullet） | ✓ |
| C3 L392-459 编码环境、L700-704 分支策略 + git-branch-guide 27 行 | L392-459；L700-704；guide 实为 27 行 | ✓ |
| A1「配置项清单 8 项」 | config.md 5 节 17 key，impl 自身枚举 5 组 | ✗ 见 M3 |
| B2「8 条状态规则 L523-533」 | L523-533 实为 10 条 bullet；枚举中的「N≥3 人工裁决」不在该区间（L258/L369） | ✗ 见 M3 |
| 文件处置清单「review-rules 22 文件」 | 实测 20 个 .md + `system_rules.json` = 21 项 | ✗ 见 L3 |
| 文件处置清单完整性 | 仓根实有 `.gitignore / agents/ / index.json / LICENSE / package.json / README.md / specpipe/`，清单未覆盖 `index.json`、`package.json` | ✗ 见 H1 |

### 4. 隐藏依赖 — 3 项未声明

- 已声明 ✓：GitHub push 权限（分支级）、v1 源 read 访问（SKILL.md + config.md + docs/）
- **未声明（high H2）**：五类审查报告模板中 4 类的格式来源实为 `agents/checker.md`（L124-158），该文件被 impl 明确划归「不迁移（归 B 仓 Story 2）」且未列入依赖节
- **未声明（medium M6）**：无状态 Builder 读取 worktree 之外 v1 源（`~/.config/...`）的权限/材料传递方式；「调研报告在本会话上下文」对 subagent 不可见
- **未声明（medium M1 附）**：`01-general` 配置项清单需 config.md 全量（已列 ✓），但禁词表未覆盖 config.md 中的 `provider` 名、`opencode.json`、`agents/oracle.md` 等表述来源（impl 已规定「不写具体配置机制」，风险可控，随 M1 一并补禁词即可）

### 5. 风险与兜底 — 语义漂移缓解不可执行；共用约定覆盖不全

- 风险识别齐备 ✓（语义漂移 / 平台词泄漏 / 三块风格漂移 / main 变更），与 spec 关键风险一一对应
- **H3**：语义漂移的缓解措施（「Checker S-S8 完整审查 + 质量门复核」）指向的审查对象都不是成稿卷：S-S8 审的是 impl 文档本身，质量门审的是代码/commit/编译/测试。成稿 12 个文件与 v1 的语义等价无任何环节校验 → 缓解不可执行
- **M7**：共用约定覆盖文件头 / 引用格式 / 保留词 / 角色名 / 配置表述 / 行数预算，但缺 H1 标题命名、卷间引用矩阵、v1→v2 术语对照表 → 三块并行 + Oracle 终审可兜底，但漂移只能靠事后发现
- **M3/M5**：计数不实与内容块无落位，本身即语义漂移的温床（Builder 按计数或按未声明块写作时易漏）

### 6. 回归面 — 本地 skill 已声明；外部安装路径与既有克隆未声明

- 已声明 ✓：`~/.config/opencode/skills/specpipe/` 本地 v1 skill 不动、dev 分支不碰 main、原址改造保留 git 历史、LICENSE/.gitignore 原样保留、退役切换归 Story 4
- **M8**：未声明 A 仓改造对**外部使用者**的影响——现 README 记载的 `skills.urls` 安装依赖 `index.json` + `specpipe/` 布局，改造后该机制失效；且 impl 的隔离依据「用户本地 skill.urls 缓存不受影响」与实测环境不符（全局 `opencode.json` 无 `skills.urls`，本地 skill 为手工拷贝）
- **L4**：既有本地克隆 `/home/starlex/project/SpecPipe`（main，HEAD `6dbaadb`，工作区干净）未声明是复用还是另克隆
- 分支假设经核实无误 ✓：仓默认分支为 `main`（`git status` 报 "On branch main"），impl「从 main 拉分支」准确；worktree 路径 `~/.local/share/opencode/worktree/dev/feat/spec-v2-rules/` 符合 v1 约定且父目录已存在、全局白名单已覆盖

## 发现的问题

1. **文件处置清单不完整：`index.json`、`package.json` 未处置** — 严重程度：**high**
   - 影响：仓根实有 8 个条目，清单只覆盖 6 个。`index.json` 是 opencode `skills.urls` 安装清单（version 2.2.0），其 `files` 列出 26 个路径（`SKILL.md`/`config.md`/`docs/*`/`review-rules/*`），改造后全部不存在 → 残留即成为引用断裂的死清单；`package.json` 的 description/keywords 含 `opencode`/`skill`/`subagent` 平台词（含 `"keywords": ["opencode", ...]`）→ 直接违反 spec 范围第 4 条与 Epic 验收标准 6。二者按 spec 范围第 1 条属「实现性内容移出（归 B 仓域）」。同时 `.gitignore` 声明「原样」保留 `node_modules/`，在 npm 打包文件移除后成为无主条目
   - 建议：在「文件处置清单」补两行——`index.json` 与 `package.json`（删除，或重写为 A 仓自有用途，二选一须明确）；若删除，同步评估 `.gitignore` 中 `node_modules/` 的去留；并把 `index.json`/`package.json` 纳入平台词扫描的必扫文件

2. **五类审查报告模板的来源声明不实，隐藏依赖 `agents/checker.md`** — 严重程度：**high**
   - 影响：B3 称「格式源自 v1 各审查节 + quality-gate.md 报告格式节」。实测 v1 SKILL.md 对 Epic Spec 审查只给行数（L169「≤40 行」）与路径，对 Spec 只给「精简，≤30 行」（L253），对 Impl（L289）/ Issue Impl（L364）只给路径——**完整报告格式定义在 `agents/checker.md` L124-158**（普通审查 / 质量门两套格式）。而 impl 的处置清单把 `agents/`（5 文件）划为「不迁移（归 B 仓 Story 2）」，依赖节也未列该文件 → B3 Builder 对 5 个报告模板中的 4 个无权威来源，只能自行发明格式，且发明结果与 Story 2 迁移的 checker agent 报告契约存在漂移风险（模板是 Agent 参照，agent 是执行者，二者必须同构）
   - 建议：二选一并写入改动点——①在 B3 声明 `agents/checker.md`（L124-158）为格式来源并列入依赖（仅作参照，不迁移入仓）；②明确 templates 为重新设计，并加一条约束「报告章节名须与 Story 2 的 checker agent 定义保持同构」，交由 Epic 验收标准 3 类的契约一致性检查兜底

3. **「语义等价」无实际验证环节（本 Story 首要风险失守）** — 严重程度：**high**
   - 影响：spec 审查基准要求「01~10 全部卷中源自 v1 的内容与 v1 SKILL.md 语义等价」「关键规则 15 条逐条落位」，spec 关键风险与 impl 风险表均把语义漂移列为首要风险。但 impl 给出的缓解链是「行号标注 → Builder 对照 → Checker S-S8 完整审查 + 质量门复核」：S-S8 的审查对象是 impl.md 本身（即本报告），质量门 7 项面向代码质量/commit/编译/测试/归档，**没有任何环节把成稿 12 个文件与 v1 源逐条比对**；Oracle 的一致性 pass 自述仅覆盖「术语 / 编号 / 交叉引用 / 风格统一」。结果是：行为面冻结（Epic 核心定性）在流程上只剩「用户读一遍」
   - 建议：在 S-S9 编码后、整理 commit / 置 `QUALITY_GATE` 前（或与质量门并行）增设「成稿语义等价核对」环节并落盘结论——按卷对照 impl 改动点标注的 v1 源区间逐条核对（可派发 Checker 执行、以 v1 为基准材料），结论作为用户放行的必过项；同时把「15 条关键规则落位表」作为该核对的检查清单

4. **B1「原样」迁移 L653，但该段含平台专属词，禁词表漏项** — 严重程度：**medium**
   - 影响：v1 L653 含 `~/.config/opencode/AGENTS.md`、`save_memory` 工具、`.opencode/memory/`、`MEMORY.md`。impl 指示「原样」与之矛盾；禁词表只覆盖 `~/.config`，漏掉 `save_memory`/`.opencode`/`MEMORY.md`（grep 自验会放过）。另禁词表对构建/依赖命令取舍不一致：禁 `npm` 却不含 `mvn`/`pip`/`pom.xml`/`requirements.txt`，而 C3 要抽象 v1 L433-437 的依赖初始化清单
   - 建议：把 B1 该条改为「抽象迁移」（三层记忆保留「全局层 / 项目层 / 任务层 + 不设独立记忆文件」的语义，路径与工具名平台无关化）；禁词表补 `save_memory`、`.opencode`、`MEMORY.md`、`~/.local/share`，并对构建命令做统一取舍（要么一并禁、要么声明为通用词）

5. **「原样」条目与「角色名用中文」约定冲突（B1/B2 共 3 处）** — 严重程度：**medium**
   - 影响：B2「转移表（v1 L515-521 五行表原样）」表头为「审查前状态（Builder 设置）」；B1「产出表（L673-686）」写入者列 12 行全为 Builder/Checker；B2 的分工描述（L511）亦为英文角色名。共用约定要求角色名用中文（执行者/审查者），Builder 面临「照抄原样」还是「按约定改名」的二义
   - 建议：对这类「结构原样」条目显式加注「结构原样，角色名按共用约定替换为中文（Builder→执行者、Checker→审查者）」，或统一改为「结构等价迁移」

6. **计数类声明不实（配置项 8 项 / 状态规则 8 条）** — 严重程度：**medium**
   - 影响：A1「v1 config.md 的 8 项」与其自身枚举（5 组）及实测 config.md（5 节 17 key）均不符；B2「8 条状态规则（L523-533）」实测为 10 条 bullet，且枚举中「N≥3 人工裁决」不在该区间（实为 L258 / L369）。计数是 Builder 的自查锚点，错误计数直接导致漏项或误引
   - 建议：逐条修正为实测值，或改为「按 v1 L523-533 全量」并删除易错的数字枚举

7. **v1 关键规则 15 条未给逐条落位** — 严重程度：**medium**
   - 影响：spec 审查基准明确要求 15 条逐条落位（第 15 条 LCR 废弃），impl 仅在 A1 引「第 1/2/5 条」。第 3/4/6~14 条虽可由各卷推知（3→A1、4→B1、6/7/8→A4、9/10→A5、11/12→C2、13→C3、14→A3+C2），但 impl 未声明对应关系，Builder 与 Checker 都无法自证完整，也是问题 3 无法闭环的原因之一
   - 建议：补一张 15 行落位表（规则 → 卷 / 节），第 15 条标注「废弃，理由：零实证使用（spec 裁决记录 1）」

8. **3 处 v1 内容块无落位** — 严重程度：**medium**
   - 影响：①`{topic}` 取值规则（v1 L694-698：Epic / Epic 下 Story / 独立 Story / Issue 四类，含「Epic 下 Story 目录与 Epic 独立」的实质语义）——B1 只提到「topic 命名修正为无前缀 kebab-case」，未说明该四类规则的去留；②质量门长时检查的后台会话机制（v1 L480-486）——禁词表已为其预留抽象表述「可持久化的后台会话」，说明作者意图迁移，但改动点未分配卷；③路径约定（L18-20）与按需加载机制（L23：SKILL.md + docs 两层按需加载）在 v2 平铺十卷后的去留未声明（spec 只隐含「卷粒度即加载粒度」）
   - 建议：对三项各自显式给出「迁移到某卷 / 声明废弃并说明理由」，避免静默丢失

9. **无状态 Builder 的输入闭合性未声明** — 严重程度：**medium**
   - 影响：依赖节把 `~/.config/opencode/skills/specpipe/`（SKILL.md + config.md + docs/）列为 read 依赖，但该路径在 worktree 之外，现有 `external_directory` 白名单仅覆盖 `~/.local/share/opencode/worktree/**`；同时依赖节称「调研报告（S0 落位映射）已在本会话上下文」——按 v1 规定 subagent 无状态、看不到 Oracle 的过程性思考，且 S0 产出不落盘。结果是任务书可能缺料或读源受阻，直接冲击三块并行的可执行性
   - 建议：在依赖节或内容生产方案中声明传递方式——Oracle 在任务书中内联所需 v1 章节片段（首选，规避权限），或显式声明为 Builder 配置读取授权；并把「调研结论中的关键映射」明确为「必须写入任务书」而非「在上下文」

10. **共用约定不足以独立防漂移** — 严重程度：**medium**
    - 影响：现约定覆盖文件头/引用格式/保留词/角色名/配置表述/行数预算，但缺 ①各卷 H1 标题命名规范（v1 有 `# 编码工作流（SpecPipe）`，v2 十卷标题格式未定，三块易各写各的）②卷间引用矩阵（哪卷引哪卷；README 卷导览表需引全部 11 卷）③v1→v2 术语对照表（角色名已定，状态名/工件名/环节名未定）
    - 建议：补 H1 命名规范（如 `# 0X-xxx.md —— 一句话职责`）+ 卷间引用清单 + 术语对照表，把漂移防线从「Oracle 终审」前移到「写作前约定」

11. **回归面未声明外部安装路径影响，隔离依据与环境不符** — 严重程度：**medium**
    - 影响：现 README 的推荐安装方式为 `skills.urls` 指向 `https://raw.githubusercontent.com/jiazhousa/SpecPipe/main`，该机制依赖 `index.json` 与 `specpipe/` 目录布局；改造后二者消失，按旧 README 安装/更新的外部使用者（含 star 者）将拉取失败或得到残缺 skill。impl 仅声明「本地 skill 隔离」，且理由「用户本地 skill.urls 缓存不受影响」经实测不成立（全局 `opencode.json` 无 `skills.urls` 字段，本地 skill 为手工拷贝）。spec 裁决 1 的「不照顾 v1 版本兼容」只针对 mapping.md，未覆盖安装面
    - 建议：显式声明该影响并给出处置——在 README 重写时承载「本仓已从 opencode skill 转为平台无关规章仓，安装方式见 OpenCodePipe」的迁移说明；或声明「已知并接受外部安装断裂」并记入 spec/AGENTS.md

12. **templates 命名与细节未定** — 严重程度：**low**
    - 影响：共用约定只给 `templates/spec-template.md` 示例与四类文档模板名，五类审查报告模板的**文件名**未定义（三块并行时 08/09 卷若需引用会断链）；模板是否中文未声明（spec 明确要求中文）；06-artifacts 的「行数上限」只作为字段名列出，未给具体值（v1：epic-spec 草案 ≤200 / 终稿 ≤500、spec ≤100 / ≤300、issue-impl ≤80、审查报告 ≤40 / ≤30）
    - 建议：补 9 个模板的完整文件名清单（含 5 个报告模板）、声明模板语言为中文、在 B1 列出各工件行数上限的具体数值

13. **块 A 内部处置声明不一致** — 严重程度：**low**
    - 影响：A3 明确声明「格式定义从正文抽走到 templates 并改为引用」，A4/A5 未做同类声明（B3 已覆盖 epic-spec/issue-impl 模板）；A4 未声明删除 E-S5 的 Checker 调用模板段（v1 L171-178），而 A2 对同类内容（L73-80）有明确声明；另 spec 要求 03 卷含「质量门终检流程与 fence 编排」，impl 把 fence 编排全部归 C3，A3 未声明以引用 10 的方式呈现
    - 建议：统一三卷的处置声明粒度；A3 补一句「fence 编排见 `10-composition.md`」；A4 补「E-S5 调用模板段删除，归 08」

14. **事实小错 3 处** — 严重程度：**low**
    - 影响：①review-rules 实际为 20 个 `.md` + `system_rules.json` = **21 项**（spec/impl 均称 22 文件）；②A1「最小验证（v1 L582-584）」中 L584 实为「交付物」条目，行号越界（L582-583 才是验证命令）；③A1「异家族互查（调研结论）」未标 v1 源——实际在 L571（且含 `kimi`/`glm` 模型名，抽象时需注意）
    - 建议：修正为实测值；源标注补 L571

15. **既有本地克隆与 .gitignore 处置未声明** — 严重程度：**low**
    - 影响：`/home/starlex/project/SpecPipe`（main，HEAD `6dbaadb`，工作区干净）是既有的 GitHub 仓本地克隆，impl 只声明「克隆至 worktree」，未说明该克隆是复用还是并存（并存会带来双克隆分叉/用户工作副本滞后的认知风险）；`.gitignore` 声明「原样」保留 `node_modules/` 与 `.specpipe/`，与「平台无关规章仓」定位有轻微不一致且未说明理由
    - 建议：声明既有克隆的处置（复用则在其上 `git worktree add`，不复用则注明仅作参考）；`.gitignore` 的去留一并纳入处置清单

16. **表述精度 2 处** — 严重程度：**low**
    - 影响：①「12 个交付文件」实为 11 卷 + templates/（内含 9 文件）= 20 个文件 / 12 类（impl 块 B 行已写「9 文件」，前后表述不统一）；②C2 检查分流表来源写「Epic 已定」，宜精确到 epic-spec 业务规则 5（机械项 whitespace/行数/commit/转移表一致性/编译/测试执行；语义项 范围对齐/术语/隐藏依赖/风险兜底/回归面）
    - 建议：统一为「12 类」；补精确来源

## 结论

# REJECT

状态：IMPL_REVIEWING → IMPL_DRAFT

> 复审建议：问题 1（补 index.json/package.json 处置）、问题 2（报告模板来源与依赖）、问题 3（增设成稿语义等价核对环节）为必改项；问题 4~11（medium）建议一并修订后再递交，问题 12~16（low）可随改。
