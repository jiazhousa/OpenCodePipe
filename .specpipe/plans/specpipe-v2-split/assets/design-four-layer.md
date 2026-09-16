# Design：Spec 驱动的四层工作流

> 讨论定稿于 2026-09-16。缘起：Spec Kit 调研 + 声明式系统（SQL/K8s/Flyway/Terraform）范式推演。
> 核心命题：**把人从真相的传递链中解耦，升格为真相的裁定者；传递全部 Agent 化，裁定保留两次人审 + 例外上浮**。

## 〇、第一性原理：注意力稀缺

> **无论是人还是 LLM，注意力都是稀缺资源——Spec 的哲学与 Agent 应用构建的哲学同源于此。**

-  token 生成成本趋零，裁定（审阅、验证、取舍）成为唯一瓶颈——价值从生成向裁定转移（Herbert Simon, 1971：「信息的丰裕造成注意力的贫乏」）。
- 人与 LLM 的注意力都稀缺，但方式不同：**人的不可扩容**（疲劳/遗忘/不一致，人因噪声累积）；**LLM 的可工程扩容**（并行/窗口/缓存/跨家族审查）。人因解耦的根本动力 = 把注意力负载从不可扩容容器迁往可扩容容器。
- Spec 是两种注意力之间的**接口协议**，须为两端优化：为人——宁缺毋滥的可读叙事；为机器——锚点与矩阵的可编译结构。
- 四层工作流本质是一条**注意力单向阀**：人的注意力只在两个放行点注入，之后由可扩容的注意力接管。
- 同一守恒律的两投影——对人的纪律（四准入/两审/例外上浮）与对机器的纪律（分层装载/隔离舱/跨家族审查）是同一条原理在不同介质上的表达。

## 一、四层结构

```
1. 叙事层    narrative     背景/意图/取舍，自然语言，人写
2. 变更层    spec.md       本次变更的事实陈述，Agent 从叙事抽取，人看人审
3. Task 层   Task.yaml     结构化执行图，Agent 抽取拆分，人看人审
4. Coding    代码/MR/fence Task.yaml 放行后 CodingAgent 自行运作，人例外介入
```

| 层 | 载体 | 生产者 | 消费者 | 人审点 |
|----|------|--------|--------|--------|
| 叙事 | narrative（Markdown） | 人 | 人（背景）+ Agent（抽取源） | 写即审 |
| 变更 | spec.md（per-change） | Agent 抽取 | 人（审）→ Agent（拆分源） | ✅ 放行点 1 |
| Task | Task.yaml + tech-context | Agent 抽取拆分 | 人（审）→ CodingAgent（执行） | ✅ 放行点 2 |
| Coding | worktree/MR | CodingAgent | 机器验证（acceptance/fence/Checker） | ❌ 例外上浮 |

**设计铁律**：
- 每层产物形态服务于该层消费者（前两层人读 Markdown，第三层机读 YAML）
- 每次层间转换 = Agent 抽取 + 人审锁定，锁定前不是编译基准
- 结构化只出现在机器消费的地方（Task 层），无消费方不结构化
- 人的参与 = 两次审查 + 例外仲裁，日常流转零人因

## 二、各层要点

### 1. 叙事层
- 内容：为什么做、给谁做、取舍、边界。**宁缺毋滥**。
- 准入四条：可判定 / 稳定 / 有消费方 / 不可由代码推导。
- FR-### 锚点内嵌（轻结构化，供回链与覆盖率计算）。

### 2. 变更层（spec.md）
- **只陈述本次变更的事实**，不是全局需求当前态——每变一份、冻结归档、append-only。
- 全局当前态 = 历史变更的机器折叠聚合，按需生成供 Agent 装载，**人不维护**。
- 变更原子粒度 = FR 级；含 evidence 挂载（审查报告/质量门分/fence 结果）。
- 结构：变更条目（add/modify/deprecate/remove + from/to）+ 指向叙事的动机链接。

### 3. Task 层（Task.yaml）
- spec.md 的执行图投影，**每 Story 一次性生成**，完结归档，不维护不更新（防双轨）。
- 最小 schema：

```yaml
meta:
  story: <topic>
  narrative: ../<narrative>
  tech_context: ../tech-context.md
  locked: true                    # 人审锁定后才可派发

tasks:
  - id: T001
    intent: "一句话意图"           # Builder 唯一必读
    narrative_ref: "spec.md#FR-0087"
    depends_on: []                 # 硬依赖（拓扑序）
    parallel_group: G1             # 组内可并行
    files: [...]                   # 文件集（并行安全判据）
    artifacts:
      - flyway: V202609161000      # 迁移版本可机器查冲突
    acceptance:                    # 完成判定（TC 挂载）
      - type: build
        cmd: "mvn test -Dtest=XxxTest"
      - type: scenario
        ref: TC-0001
        given / when / then
    risk: medium
```

- 管控语义（确定性）：`ready(T) = 前置全 done`；派发 = ready × parallel_group；`done(T) = acceptance 全绿 + commit`；失败上抛 Oracle 仲裁。

### 4. Coding 层
- Task.yaml 放行后人退出；acceptance / fence / Checker 全机器验证。
- 人被拉回的条件（例外上浮）：BLOCKED、质量门 REJECT 超限、跨级风险、意图歧义不可自解。

## 三、确定性校验清单（无 LLM 参与，纯图论/集合运算）

| 校验 | 算法 |
|------|------|
| 依赖无环 | 拓扑排序可完成 |
| 并行安全 | 无 depends_on 的任务对 files 交集必空 |
| 冲突预警 | files 有交集但未声明依赖 → 报缺失 |
| 验收完备 | acceptance 非空且 ≥1 项可机器执行 |
| Flyway 冲突 | 版本号全局单调无重 |
| 叙事锚点有效 | narrative_ref 指向的 FR 锚点存在 |
| FR 覆盖率 | spec.md 全部 FR-### 被 ≥1 Task 引用，缺口即编译错误 |

> 「TC 缺失」从 Checker 的审查意见降级为 Task.yaml 的编译错误。

## 四、与 specpipe 的映射（迁移零破坏）

| 现状 | 去向 |
|------|------|
| plans/{topic}/spec.md（全量需求文档） | 叙事层 + 变更层（改为只陈述本次变更） |
| impl.md（Markdown 任务书） | Task.yaml（机读）+ tech-context.md（人读） |
| Oracle 脑内依赖排序/文件集判断 | Task.yaml 声明 + 校验脚本 |
| Checker S-S8 审任务切分 | 脚本查图（上表）+ Checker 查语义 |
| .stage 编码阶段 | 可由 Task 状态聚合推导 |
| reviews/fence 结果（游离） | 挂变更条目 evidence 段 |

## 五、分级适用

- **Issue**：叙事 → 直通 Coding（跳过变更层/Task 层仪式）
- **Story**：走全套四层
- **Epic**：走全套 + 变更链是 Epic 审计的主载体

## 六、前置认知（本设计的理论根据，详论见对话记录）

1. 错误 spec < 无 spec < 精确 spec——LLM 对 spec 默认信任，错误信息比缺失危险。
2. 人因解耦的历史规律：验证机制先行，解耦后至（编译器→高级语言；CI→发布；controller→K8s）。
3. 真值双源：意图本体（spec）+ 事实本体（代码/DB/运行时），需要持续对账（调研/converge）。
4. plan/apply 分离（Terraform 模式）是对「概率编译不可重现」的工程解法，作为第三阶段演进方向。

## 七、演进路径（验证强度跑在结构化幅度前面）

1. **试点（下个 Story）**：spec.md 改为变更式陈述 + FR 锚点；Task.yaml 手写试点 + 校验脚本；Checker 按矩阵逐条核。
2. **固化（2-3 Story 后）**：changes/ 目录 + evidence 挂载；Oracle 产出 Task.yaml 常态化；确定性校验脚本入库。
3. **深化（结构化成熟后）**：TC 参数化可执行 + plan/apply 分离试点（人审 plan 不审 code diff）。
