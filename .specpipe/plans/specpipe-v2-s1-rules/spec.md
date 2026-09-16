# Spec: Story 1 — A 仓规章 v1（SpecPipe 仓原址删减重组）

## 背景

Epic `specpipe-v2-split` 已放行（M1 目标：规章冻结）。现 GitHub 仓 `jiazhousa/SpecPipe` 为 v1 形态（opencode skill：SKILL.md 708 行 + config.md + docs/ 三类文件），需原址改造（保留 git 历史）为 **A 仓：平台无关的规章仓**。S0 调研已完成全章节落位映射，确认 708 行可完整映射、无内容必须废弃；S1 五项决策点已全部裁决。

## 目标

产出 A 仓规章 v1：**SpecFirst 原则下的工作流规章 + 工件规范**（方法论所有物，消费者是 agent 与工具，规范体条文、不诠释哲学），成为 B 仓（OpenCodePipe）实现的 spec 基线。

## 范围

**做**：

1. **删减**：现 README 的安装 / 配置 / agents / 环境要求等实现性章节移出（归 B 仓域）
2. **规章卷组织**（按**运行时加载单位**拆卷——每个文件 ≈ Agent 一个工作阶段所需的完整上下文，单卷目标 ≤150 行）：
   - `README.md` — 定位段（SpecFirst 原则叙事 + 体系表述"SpecPipe = 规章，OpenCodePipe = 硬件层面践行"）+ 卷导览，定位段 ≤10 行
   - `01-general.md` — 总则硬条文 ≤20 行（Plan 不编码 / 放行不自动推进 / impl 唯一事实源 / Builder-Checker 异家族互查 / 最小验证原则 / 文档中文）+ 工作流触发 + 需求分级表（Epic/Story/Issue 判定特征）+ 配置项清单与修改联动的文档化描述
   - `02-workflow.md` — 流程总览（三路径图）+ 公共环节（S0 调研 / S1 前置访谈 / S2 分级判定 / 用户放行机制）
   - `03-story-path.md` — Story 路径全环节（S-S3~S-S10，含质量门终检流程与 fence 编排）
   - `04-epic-path.md` — Epic 路径全环节（E-S3~E-S5、Story 路线图推进、Epic 终检）
   - `05-issue-path.md` — Issue 路径全环节（I-S3~I-S7、升级机制）
   - `06-artifacts.md` — 工件规范：产出表（**topic 命名按实证修正：无前缀 kebab-case，类型由 .stage 状态链标识**）+ 各工件定义（epic-spec / spec / impl / issue-impl / 五类审查报告 / AGENTS.md 三层记忆）+ 行数上限 + 审查轮次 N 计数规则 + 行号语义标注规范
   - `07-state-machine.md` — **B 仓对口契约卷**：三路径状态链全量 + Checker 状态转移表（5 类审查 × PASS/REJECT）+ SPEC_OVERTURN 连锁回退 + S2 重分级 / Issue 升级 / 中断恢复的状态处理 + `.stage` / `.stage-history`（JSONL：ts/topic/from/to/actor）文件格式
   - `08-roles.md` — 五角色职责矩阵（调度者 / 调研者 / 审查者 / 执行者 / 视觉解析者，平台无关表述）+ 任务书标准（四要素 + 责任倒逼条款）+ 调度协议（平级互不调用 / BLOCKED 上报裁决）+ 调研者检索工具的职责性表述（三个只读检索 CLI：主搜索 / 备选搜索 / 文档查询；安装与命令白名单细节归 B 仓）
   - `09-check-split.md` — 检查分流表（机械项归工具 / 语义项归 Checker 模型）+ 五类审查清单（Epic Spec 3 项 / Spec 2 项 / Impl 6 项 / Issue Impl 精简 / 质量门 7 项）+ 质量评分规则 + 规则注入机制规范（规则库本体归属 OpenCodePipe、后续 Story 交付，本卷仅定义注入机制）
   - `10-composition.md` — worktree 与分支管控的**规范层**（编码前置条件 / worktree+新分支纪律 / 预热与放行解耦原则）+ 分支策略 + fence 编排（并行 / 汇合点 / 增量重跑）+ user-rule 组合覆盖机制（加载顺序与冲突规则）
   - `templates/` — spec / impl / issue-impl / epic-spec 四种文档模板 + 五类审查报告模板（中文；**面向 Agent 的工件参照**：章节名称 + 每节内容规约 + 行数上限注释）；流程卷引用模板路径、不重复格式定义
3. **审查基准（语义等价范围）**：01~10 全部卷中**源自 v1 的内容**与 v1 SKILL.md 对应内容**语义等价**（提炼重组 ≠ 重设计，行为面冻结；README 定位段与 templates 的结构重组除外）。v1「关键规则」15 条逐条落位：第 1~14 条分布于 01 总则与各规章卷，第 15 条（LCR）废弃
4. **平台无关约束**：全文无 opencode 专属词汇（工具调用语法 / 权限配置 JSON / external_directory / agents 路径 / CLI 安装细节）——此类内容只以平台无关抽象表述（如"subagent 调度机制""路径写权限白名单"），实现细节归 B 仓
5. **B 仓引用适配**：A 仓各卷将被 OpenCodePipe 以**本地副本（vendored）**方式引用——B 仓 skill/plugin 安装时携带规章副本（发版时从 A 仓拉取指定 tag + 一致性校验），非运行时网络引用。本 Story 保证 A 仓的引用适配性：卷间引用一律相对路径、不依赖任何外部资源、卷粒度即加载粒度

**不做**：

- B 仓任何内容（agent 定义迁移 / 插件 / CLI——Story 2/3）
- review-rules（22 文件）的迁移与清理（归 B 仓 + 后续项）
- xiezhi 字段移除与 rules 内容重审（后续项，仅映射表记录）
- organic 产物（acceptance.md / assets/ / fence 汇总）正式化（本版不带，映射表记录）
- 哲学叙事长文（README 定位段几行即可，完整叙事留外部）
- 工作流语义任何变更

## 裁决记录（S-S4）

1. **mapping.md 不作为交付物**——不照顾 v1 版本兼容；四项决策（LCR 废弃：零实证使用 / organic 产物暂不正式化：后续版本考虑 / review-rules 迁 B 仓：xiezhi 字段移除与内容重审为后续项 / 模型配置双源归一：Story 2 决策项）以本 spec 与 epic-spec 记录为准
2. **卷粒度按运行时加载单位拆分**，单卷目标 ≤150 行（原 02-workflow 大卷拆为 02 总览 + 03/04/05 三路径分卷）
3. **worktree 保留规范层**（前置条件 / 分支纪律 / 预热解耦原则），命令级操作细节归 B 仓
4. **templates 定位为 Agent 参照**（章节名 + 内容规约），流程卷引用模板路径、不重复格式定义
5. **B→A 引用机制**：运行时 agent 只能 read 本地文件 → 引用物理化——B 仓安装/发版时携带规章副本（vendored，发版流程从 A 仓拉取 tag + 一致性校验），`ocp init` 铺设。机制本体为 Story 2 架构设计项，本 Story 仅保证 A 仓引用适配性

## 关键风险

- 语义等价性把握：提炼重组过程中无意改变语义（如状态转移条件弱化）→ S-S5 审查 + 用户放行双重把关；以本 spec 裁决记录 + epic-spec 为对照基础
- 平台词泄漏：规范体写作中混入 opencode 词汇 → 自查 + 验收标准 6（平台词扫描，Story 3 工具就位前人工核查）
