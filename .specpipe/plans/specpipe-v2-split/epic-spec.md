# Epic Spec: SpecPipe v2 软硬分离

## 背景

**思想根基（Spec 哲学）**：先规格后编码——规格是人（意图）与机器（执行）之间的接口协议；注意力稀缺，人的裁定只投放在放行点（学习了 Spec Kit 等先例，完整叙事不入仓）。本体系是该哲学的工程化落地。

SpecPipe v1 以单一 opencode skill 形态存在（SKILL.md ~700 行），将两类性质不同的内容混在同一份 prompt 文档中：

- **流程判断**（分级判定、访谈节奏、放行裁决）——概率系统（LLM）所擅长，规则文本治理即可
- **事实与强制**（.stage 落盘、Checker 写权限边界、状态转移合法性）——确定性系统所擅长，v1 中却依赖模型自觉执行（99% 而非 100%）

v2 拆分为两个独立仓库：

- **A 仓 `SpecPipe`**（现仓改造删减）：**规章仓**——工作流规章 + 工件规范，平台无关，规范体条文（只写"是什么/必须怎样"，不诠释哲学）。消费者是 agent 与工具，不是人
- **B 仓 `OpenCodePipe`**（新仓）：**工具仓**——opencode 插件 + CLI 工具族 + agent 定义与权限。只做状态机强制、权限、机械检查，不承载流程逻辑。命名基线：repo `OpenCodePipe` / CLI 命令 `ocp` / npm 包 `opencodepipe`

**核心定性（行为面冻结原则）**：v2 不改变工作流语义——状态机语义、工件集、角色职责与 v1 完全一致，仅执行面变化（自觉→强制）。A 仓的各规章卷（02-workflow、03~05 三路径、06-artifacts、07-state-machine 等）是对 v1 SKILL.md 的提炼重组，不是重设计。这是迁移风险低的根本论证。

体系三层：**Spec 哲学（思想根基）→ SpecPipe（方法论：工作流定义 + 工件定义，Harness / Agent 无关）→ OpenCodePipe（工具集：SpecPipe 完整工程化实践在 OpenCode 上的体现与最后一公里）**。叙事定位：SpecPipe 仓是作者基于 Spec 哲学总结的**工件规范与工作流规范**（方法论所有物，平台无关）；OpenCodePipe 是面向 OpenCode 的插件与工具包，在平台层面践行 SpecPipe 中的 workflow 与工件规范（平台实现物）。

## 业务规则

1. **判断与强制的分界**：判断类规则（何时推进、如何分级、访谈节奏）留在 A 仓规章由模型执行；强制类规则（转移合法性、写权限、质量门前置）必须下沉 B 仓工具硬性执行。一句话：判断交给模型，强制交给代码
2. **转移表唯一事实源在 A 仓** `07-state-machine.md`（状态清单 + 合法转移表——含 5 类审查的 Checker 状态转移与 SPEC_OVERTURN 回退边——+ 阻塞语义 + S2 重分级 / 升级机制 / 中断恢复的状态处理 + `.stage`/`.stage-history` 文件格式，history 为 JSONL：ts/topic/from/to/actor）；B 仓以数据文件形式加载，**禁止硬编码**
3. **角色职责双宿分离**：平台无关的角色职责（调度者/调研者/审查者/执行者/视觉解析者）定义于 A 仓 `08-roles.md`；B 仓 agent 文件是对口实现，文件头须声明对应章节
4. **文件布局即 IPC**：`{wf}/plans/{topic}/` 目录结构、`reviews/` 报告命名、AGENTS.md 三层记忆的权威定义在 A 仓 `06-artifacts.md`（subAgent 间不通信，全靠文件系统协作）
5. **检查分流**：机械可判定项（whitespace / 行数上限 / commit 格式 / 转移表一致性 / 编译 / 测试执行）归 B 仓 check-tools；语义判定项（范围对齐 / 术语一致性 / 隐藏依赖 / 风险兜底 / 回归面）归 Checker 模型。分流表定义于 A 仓 `09-check-split.md`
6. **组合覆盖机制**：user-rule（私有，个人偏好）按 A 仓 `10-composition.md` 的加载顺序叠加于方法论默认值之上。入仓筛选用**"换人依然成立"测试**：成立者进 A 仓（如 Builder/Checker 异家族互查），不成立者进 user-rule（如中文回复、模型家族选择 glm × deepseek）
7. **git 管控强制化**：分支策略（develop/release/master、dev/feat/* 命名）为 B 仓配置数据；**pre-push hook 校验 `.stage=DONE` 且 `.stage-history` 含质量门 PASS 记录，否则拒绝 push**
8. **A 仓平台无关约束**：全文不得出现 opencode 专属词汇（工具调用语法、权限配置语法）；平台专属操作细节归 B 仓 agent 定义与文档
9. **机制与用户决策分离**：B 仓只交付机制（强制、校验、铺设、自检）；用户环境资产（检索命令、模型选型、目录名、分支名等具体值）由用户自备并以配置声明——B 仓不内置检索脚本等用户工具，doctor 仅做可用性发现与报告

## 验收标准

1. 四个 Story 全部 DONE（各自质量门 PASS）
2. 新体系集成验收通过：`.stage-history` 完整留痕、质量门 PASS 记录、pre-push 拦截与放行各验证一次（实跑载体与规模是 Story 4 的**前置决策项**——用户已确认在 S1-S3 完成后单独讨论，候选：CRM demo `03-crm-agent-pattern/demo` Issue 级）
3. 转移表一致性校验通过（A 仓 07 与 B 仓数据文件 diff 为空）
4. 旧 specpipe skill 退役归档，全局 AGENTS.md 更新为新体系指引
5. B 仓 plugin / agents / cli / check-tools 单测全绿，fence 通过
6. A 仓平台无关性检查通过（check-tools 平台词扫描零命中，词表覆盖 opencode 专属工具调用 / 权限配置语法）

## 范围边界

**做**：A 仓删减重组（规章 v1 + 模板库）、B 仓新建（repo 骨架 / plugin / agents / cli / check-tools / git hooks）、user-rule 抽取、CRM demo 集成验收、旧体系退役切换。

**不做**：
- 工作流语义变更（不新增状态 / 阶段 / 工件类型——行为面冻结）
- 其他平台实际移植（Claude Code / Cursor 等仅保证 A 仓无平台词泄漏，不做安装支持）
- 哲学叙事文档（完整叙事留面试材料 / 博客；A 仓 README 仅保留几行定位段）
- CRM demo 的业务功能变更（它只是验证场）

## 关键风险

| 风险 | 缓解 |
|---|---|
| opencode plugin API 变动 | Story 2 的 S0 调研现版本 API 并锁版本（前例：opencode-quota 锁 1.18.30） |
| 并行期新旧体系混用混乱 | 切换前 workbench 主体保持旧体系；新体系仅在 A/B 仓与 CRM demo 验收中启用 |
| A 仓规范有洞（转移遗漏 / 字段缺失） | Story 1 Checker 审查完备性 + Story 2 单测实际暴露后回补规约 |
| pre-push hook 干扰既有工作流 | hook 仅由 `ocp init` 显式安装的项目启用，不全局注入 |

## Story 路线图

### Story 1: A 仓规章 v1（SpecPipe 仓删减重组）✅
- 优先级 P0 / 无依赖 / 预估 3-4 天
- 范围：现 SpecPipe 仓**原址改造**（保留 git 历史；安装 / 配置 / agents 章节移出）+ 规章卷组织（**按运行时加载单位拆卷，单卷目标 ≤150 行**：`README` + `01-general` + `02-workflow`（总览+公共环节）+ `03-story-path` / `04-epic-path` / `05-issue-path` + `06-artifacts` + `07-state-machine`（B 仓对口契约）+ `08-roles` + `09-check-split` + `10-composition` + `templates/`（面向 Agent 的工件参照：章节名+内容规约））；v1 章节落位声明由 Story spec 的卷组织与裁决记录承载（**不设独立映射表文档**——不照顾 v1 兼容，用户裁决）
- 审查基准：01~10 全部卷中源自 v1 的内容与 v1 SKILL.md 对应内容**语义等价**（提炼重组而非重设计；README 定位段与 templates 结构重组除外）；v1 关键规则 15 条逐条落位（第 15 条 LCR 废弃）
- 里程碑角色：**M1 规章冻结**——Story 1 用户放行后，A 仓 v1 即为 B 仓的 spec 基线

### Story 2: B 仓核心（骨架 + 插件 + agent 定义）
- 优先级 P0 / 依赖 Story 1（07-state-machine 契约）/ 预估 4-5 天
- 范围：repo 骨架（TS 工程 / 测试 / fence / CI，**预留 cli 与 check-tools 的 bin 槽位、目录与 CI job，消除与 Story 3 的骨架文件冲突**）、plugin（`stage_get` / `stage_set`：转移合法性校验 + `.stage-history` 留痕，转移表以数据文件加载）、agents/（五角色定义迁移 + 权限白名单：Checker edit 路径白名单、Explorer bash 只读白名单）、单测（转移表全路径覆盖 / 非法转移拒绝 / history 格式 / 权限生效）
- S0 前置调研：opencode plugin/tool 注册 API 现状与版本锁定

### Story 3: B 仓 CLI 工具族（git 管控强制化）
- 优先级 P1 / 依赖 Story 2 骨架完成（骨架已预留 cli / check-tools 槽位；此后填充物文件集与 Story 2 不相交，可与 Story 2 收尾并行）
- 范围：cli（`ocp init` 铺设 {wf}/ 目录 + 模板 + fence 脚本模板 + hook 安装；`ocp doctor` 环境自检；`ocp worktree` 创建封装 + 分支命名校验）、pre-push hook、check-tools（whitespace / 行数上限 / commit 格式 / 转移表一致性校验 / **A 仓平台词扫描**）、单测
- 验收含：pre-push 真实拦截一次未过质量门的 push（留证据）

### Story 4: 组合验收 + 退役切换
- 优先级 P0 / 依赖 Story 2 + 3 / 预估 2-3 天
- 范围：user-rule 抽取成文（按 10-composition 组合接入）、新体系集成实跑（载体与规模待 S1-S3 完成后单独确定，当前候选 CRM demo Issue 级；留痕归档）、旧 specpipe skill 退役归档、AGENTS.md 指引更新、Epic 终检
- 定性：切换门槛（集成验收），非表演性自举——仓内内容保持泛化，不为举证造内容

## 交付顺序与里程碑

S1 → S2 → S3（后半可与 S2 并行）→ S4

- **M1 规章冻结**：Story 1 用户放行（A 仓 v1 = B 仓的 spec 基线）
- **M2 强制层就绪**：Story 2 + 3 质量门 PASS（转移校验 / 权限 / hook 全部生效）
- **M3 切换完成**：Story 4 DONE → Epic ALL_DONE（新体系上线，旧 skill 归档）
