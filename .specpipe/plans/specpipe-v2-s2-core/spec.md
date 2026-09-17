# Spec: Story 2 —— B 仓核心（骨架 + 转移表数据 + stage 插件 + agents）

## 背景

Epic `specpipe-v2-split` 的 Story 2。前置已闭环：S1 冻结 A 仓规章 v1（M1）；S0 调研确认 opencode 插件 API 可行（`Hooks.tool` + zod args、`permission.ask` 钩子、Bun in-process 可读写文件/执行子进程），版本裁决 `1.18.*`（lockfile 固化 + 加载冒烟兜底）。本 Story 把 B 仓从占位骨架变成**可安装、可测试的强制层核心**，为 S3（CLI 工具族）与 S4（切换验收）打地基。

## 目标

交付四部件：① TS 工程骨架（含 S3 槽位预留，消除后续骨架冲突）② A 仓 07 契约的转移表机读数据文件（plugin 与 check-tools 的共同事实源）③ `stage_get` / `stage_set` 插件（转移合法性校验 + `.stage-history` 留痕，状态机从"模型自觉"变"工具强制"）④ 五角色代理定义迁移 + 权限白名单（审查者写路径、调研者只读在平台层硬性生效）。

## 范围

**做**：

1. **2a TS 工程骨架**：单包 `opencodepipe`（bun + TypeScript + bun test）；fence 脚本（含**插件加载冒烟**：import + hooks 注册 + tool 定义解析）；GitHub Actions CI；`cli/` / `check-tools/` 的 bin 槽位与目录占位（仅空壳 + README，消除 S3 骨架文件冲突）；依赖 `@opencode-ai/plugin` `1.18.*` + lockfile 入库
2. **2b 转移表数据文件**：`configs/` 下 A 仓 07-state-machine 的机读形态——状态清单（三路径 + ALL_DONE）、合法转移边（含 5 类审查 PASS/REJECT 分支、用户放行边、SPEC_OVERTURN 回退边）、`.stage-history` JSONL 字段定义；**plugin 与 check-tools 共同消费此文件，禁止硬编码**
3. **2c stage 插件**：`stage_get`（读指定 topic 的 `.stage`）与 `stage_set`（校验转移合法性 → 写 `.stage` → 追加 `.stage-history`，字段 ts/topic/from/to/actor 按 07 契约）；非法转移拒绝并给出合法后继提示；数据文件加载自 2b
4. **2d agents 五角色迁移**：五角色定义自 v1 迁移入 `agents/`（调度者/调研者/审查者/执行者/视觉解析者），文件头声明对口 A 仓 08 卷章节；权限白名单保留 v1 结构（审查者 edit 路径白名单、调研者只读白名单）；配套 agent 配置模板（模型/variant 为用户决策占位，不写死）

**不做**：

- `ocp init` / `doctor` / `worktree` / pre-push hook / check-tools 实体（S3 范围，本 Story 仅预留槽位）
- user-rule 抽取、旧体系退役、集成实跑（S4）
- 检索脚本内置（机制与用户决策分离原则——doctor 未来只做可用性发现）
- npm 公开发布（本地可安装即可，发布节奏另行决策）
- Task.yaml 七项校验（S5 试点，仅预留模块位）

## 待澄清

1. **包结构**：推荐**单包**——npm 包名基线已定 `opencodepipe`，plugin 入口（`exports`）与 CLI（`bin`）共存一包，configs 数据文件同包内 import 最简；monorepo 对当前规模（5 部件）属过度设计。是否同意？
2. **plugin 分发形态**：v1 阶段推荐**本地目录方式**（`~/.config/opencode/plugins/` 复制或软链）供自举验证，npm 分发待 S4 验收后启用。是否同意？
3. **转移表数据格式**：推荐 **JSON**——与 `.stage-history`（JSONL）同族、无缩进敏感问题、bun 原生解析零依赖。是否同意？
4. **oracle 定义迁移**：v1 的 `oracle.md` 是主会话定义（mode: primary），随本 Story 一并迁入 `agents/`（五角色完整性）还是只迁四个下级代理（oracle 留在用户配置域，因其含个人模型选型）？推荐**一并迁入、模型字段留占位**。
5. **CI 平台**：GitHub Actions（B 仓托管在 GitHub），跑 typecheck + test + 冒烟。是否同意？
