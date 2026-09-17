# Spec: Story 2 —— B 仓核心（骨架 + 转移表数据 + stage 插件 + agents）

## 背景

Epic `specpipe-v2-split` 的 Story 2。前置已闭环：S1 冻结 A 仓规章 v1（M1）；S0 调研确认 opencode 插件 API 可行（`Hooks.tool` + zod args、`permission.ask` 钩子、Bun in-process 可读写文件/执行子进程），版本裁决 `1.18.*`（lockfile 固化 + 加载冒烟兜底）。本 Story 把 B 仓从占位骨架变成**可安装、可测试的强制层核心**，为 S3（CLI 工具族）与 S4（切换验收）打地基。

## 业务规则

1. **单包结构**：npm 包名 `opencodepipe`（基线命名）；plugin 入口（`exports`）与 CLI（`bin` 字段）共存一包；`configs/` 数据文件以同包内 import 消费。不建 monorepo。
2. **版本策略**：依赖 `@opencode-ai/plugin`（及需要的 `@opencode-ai/sdk`）声明 `1.18.*`，lockfile 入库；fence 含**插件加载冒烟**（import 插件入口 + hooks 注册 + tool 定义解析，秒级）——patch 浮动引入的 API 漂移由冒烟第一时间暴露。兼容性承诺口径：仅 V1 宿主 1.18.x。
3. **转移表数据单一事实源**：`configs/` 下 JSON 数据文件承载 A 仓 07-state-machine 契约的机读形态——状态清单（Epic 5 + ALL_DONE / Story 10 / Issue 6）、合法转移边全集（含 5 类审查 PASS/REJECT 分支、用户放行边、SPEC_OVERTURN 回退边、Issue 升级清理语义）、`.stage-history` JSONL 字段定义（ts/topic/from/to/actor，actor ∈ {调度者, 审查者}）。plugin（本 Story）与 check-tools（S3 转移表一致性校验）共同消费此文件，**代码中禁止硬编码任何状态或转移**。
4. **stage 工具行为契约**：`stage_get`——入参 topic，返回该 topic 的当前 `.stage` 内容；`stage_set`——入参 topic + 目标状态 + actor，执行"转移合法性校验（查数据文件）→ 写 `.stage` → 追加 `.stage-history` 一行"，三者原子（校验失败不产生任何写）。非法转移返回错误 + 当前状态的合法后继清单。路径基准 `{wf}/plans/{topic}/`（`{wf}` 可配置，默认 `.specpipe/`）。
5. **agents 五角色迁移**：五角色定义（含调度者 oracle——主会话定义）自 v1 迁入 `agents/`；每个文件头部声明对口 A 仓 08-roles.md 章节；权限白名单保留 v1 结构（审查者 edit 路径白名单 + bash 编译测试白名单、调研者只读白名单）；模型/variant 字段为**用户决策占位**（示例值 + 注释说明可覆盖），不写死个人选型。
6. **plugin 分发形态**：本 Story 采用本地目录方式（复制或软链至 `~/.config/opencode/plugins/`）完成自举验证；npm 分发待 S4 验收后启用（届时 pin 精确版本，规避 `@latest` 钉死坑）。
7. **CI 暂不建**（用户裁决 2026-09-17）：质量保障 = fence 本地跑（typecheck + bun test + 加载冒烟）；CI 待 S3 或 npm 发布前补建。
8. **S3 槽位预留**：`cli/` 与 `check-tools/` 的 bin 槽位（package.json `bin` 段占位）与目录骨架（空壳 + README）在本 Story 建立，消除 S3 的骨架文件冲突；不实现任何 CLI 逻辑。

## 验收标准

1. fence 全绿：typecheck + 全部单测 + 插件加载冒烟通过
2. 转移表单测：三路径全部合法转移序列覆盖（含审查 PASS/REJECT、放行、OVERTURN 回退）；代表性非法转移全部拒绝；`.stage-history` JSONL 行格式与 07 契约逐字段一致
3. stage 工具手验：本地目录方式安装后，opencode 会话中 `stage_get`/`stage_set` 可调用（get/set/非法转移拒绝三种情形各验一次，截图或会话记录留证）
4. agents 五文件迁移完成：文件头对口声明齐全；权限白名单与 v1 等价（diff 核对）；oracle 模型字段为占位形态
5. 数据文件一致性：`configs/` 转移表与 A 仓 07 卷逐条人工核对无缺漏（S3e 交付后转工具化持续校验）

## 范围

**做**：2a TS 工程骨架（bun + TypeScript + bun test + fence，槽位预留）；2b 转移表 JSON 数据文件；2c stage_get/stage_set 插件；2d agents 五角色迁移 + 权限白名单 + 配置模板。

**不做**：`ocp init`/`doctor`/`worktree`/pre-push/check-tools 实体（S3）；user-rule 抽取与旧体系退役（S4）；检索脚本内置（机制与用户决策分离）；npm 公开发布；Task.yaml 七项校验（S5 预留模块位）；CI 建设（用户裁决暂缓）。

## 关键风险

| 风险 | 缓解 |
|---|---|
| hook 类型定义与运行时触发不一致（上游 issue #7641） | 加载冒烟 + 验收 3 的真机手验，不只信 d.ts |
| `1.18.*` patch 浮动引入 API 漂移 | lockfile 固化日常组合 + fence 冒烟拦截 |
| 转移边推导遗漏（07 卷为叙述性文档，转移边全集需从状态链+审查表+回退规则推导，如 EPIC_SPEC_APPROVED→ALL_DONE 的多 Story 汇聚语义） | 数据文件作为独立评审对象，逐条对照 07 卷；S3e 工具化后持续校验 |
| oracle 迁入后与本机现役 `~/.config/opencode/agents/oracle.md` 的安装覆盖关系 | 安装说明明确"复制不改名/软链优先"策略；本机现役定义在 S4 退役时统一切换 |
| 单包内 plugin 与未来 CLI 的入口耦合 | `exports` 子路径隔离（`./plugin`、`./cli`），S3 填充时不动 plugin 入口 |
