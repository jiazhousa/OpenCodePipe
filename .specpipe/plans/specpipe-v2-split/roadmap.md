# SpecPipe v2 → v3 Roadmap

> 维护于 Epic specpipe-v2-split 档案；Story 状态与 epic-spec.md 同步更新。v3 部分依据 assets/design-four-layer.md（四层工作流设计）。

## 当前状态（2026-09-16）

- **M1 规章冻结 ✅**：A 仓 SpecPipe v1 已合并 main（`2b21dfb → 6e18647`），12 文件 1028 行，质量门 92/100
- B 仓 OpenCodePipe 已 init（root commit `5ed3e28`：README + 目录骨架 + License）
- 凭证：`~/.env`（GH_TOKEN）+ `~/.git-credentials`（git 自动认证）；2026-09-17 token 已轮换，冗余条目清理为单行
- 开发模式（2026-09-17 用户拍板）：A/B 两仓日常迭代**直接提交 main**（个人仓，免分支/PR 开销）；10-composition 的 Git 分支策略面向使用方项目，不约束本体系两仓自身

## v2 拆分（Epic specpipe-v2-split，进行中）

| Story | 内容 | 状态 | 里程碑 |
|---|---|---|---|
| S1 | A 仓规章 v1 | ✅ DONE | M1 规章冻结 |
| S2 | B 仓核心（4 部件：骨架 / 转移表数据 / stage 插件 / agents） | ✅ DONE（2026-09-17，质量门 94/100 + fence 三步全绿；插件 file:// 挂载实证、五角色迁移保真 diff） | M2 前半 |
| S3 | B 仓 CLI（5 部件：init / doctor / worktree / pre-push / check-tools） | ⏳ 依赖 S2 骨架 | **M2 强制层就绪** |
| S4 | 组合验收（4 部件：user-rule / 实跑 / 退役 / Epic 终检） | ⏳ 依赖 S2+S3 | **M3 切换完成 → ALL_DONE** |
| S5 | 四层试点（候选，待立项确认）：变更式 spec + FR 锚点 + Task.yaml 手写 + 校验脚本 + A 仓 v1.1（修订 02/03/06/07 卷） | 🆕 建议 | M4 v3 起点 |

### 部件级拆分（验收单元）

**Story 2 —— B 仓核心**

| # | 部件 | 交付物 | 验收要点 |
|---|---|---|---|
| 2a | TS 工程骨架 | bun + TS 工程、测试框架、fence 脚本；预留 cli / check-tools 的 bin 槽位与目录 | fence 全绿；槽位消除与 S3 的骨架文件冲突；版本策略落地（`@opencode-ai/plugin` `1.18.*` + lockfile 入库 + 插件加载冒烟进 fence）；monorepo vs 单包为 spec 阶段决策项（已裁决：单包）；CI 暂不建（用户裁决 2026-09-17，待 S3/发布前补） |
| 2b | 转移表数据文件 | `configs/` 下 A 仓 07-state-machine 契约的机读形态（状态清单 + 合法转移表 + JSONL 字段定义） | 与 07 卷逐条一致；plugin 与 check-tools（S3e）共同消费同一数据文件，禁止硬编码 |
| 2c | stage 插件 | `stage_get` / `stage_set`（转移合法性校验 + `.stage-history` 留痕） | 单测：转移表全路径覆盖 / 非法转移拒绝 / history JSONL 格式 |
| 2d | agents 五角色 | 五角色定义迁移（自 v1）+ 权限白名单（checker edit 路径白名单、explorer 只读白名单）+ agent 配置模板 | 文件头声明对口 A 仓 08 卷章节；模型/variant 留用户决策位；白名单生效单测 |

**Story 3 —— CLI 工具族**

| # | 部件 | 交付物 | 验收要点 |
|---|---|---|---|
| 3a | ocp init | 铺设 `{wf}/` 目录 + vendored 模板（源自 A 仓 tag 拉取）+ pre-push hook 安装 | hook 显式 opt-in（不全局注入）；vendored 同步含转移表一致性校验 |
| 3b | ocp doctor | 环境自检 | 检索三通道**可用性发现与报告**（不内置脚本）；git/opencode 版本、agents/plugin 安装状态 |
| 3c | ocp worktree | worktree 创建封装 + 分支命名校验 | 三级格式（目标/性质/名称）校验 |
| 3d | pre-push hook | 校验 `.stage=DONE` 且 `.stage-history` 含质量门 PASS 记录 | **真实拦截一次未过质量门的 push（留证据）** |
| 3e | check-tools | 禁词扫描 / 行数预算 / commit 格式 / 转移表一致性（A 仓 07 vs configs 数据文件 diff）/ A 仓平台词扫描 | 平台无关性检查从一次性人工转自动化持续保障；预留 Task.yaml 七项图论校验模块位（S5） |

**Story 4 —— 组合验收 + 退役切换**

| # | 部件 | 交付物 | 验收要点 |
|---|---|---|---|
| 4a | user-rule 成文 | 个人规则按 10-composition 组合接入 | 个人偏好项与仓默认分离清晰（"换人依然成立"测试） |
| 4b | 集成实跑 | 实跑载体（**待用户确认**，候选 CRM demo Issue 级）+ 全程留痕归档 | pre-push 拦截与放行各验证一次 |
| 4c | 旧体系退役 | v1 skill 归档 + 全局 AGENTS.md 指引更新 + BOOTSTRAP.md 过渡期安装节替换为 `ocp init` | 新体系完全接管 |
| 4d | Epic 终检 | epic-spec 验收标准 6 项逐项核验 | ALL_DONE |

### A 仓状态说明

**v1 内容完成，无未竟项**（10 卷 795 行 + README + templates 9 件 319 行；质量门 92/100；平台词扫描零命中；M1 冻结）。后续变更均有明确触发器，不在本 Epic 待办内：

1. **S5 立项** → A 仓 v1.1 修订（02/03/06/07 卷：变更式 spec / Task.yaml / evidence 挂载）
2. **S3e 交付** → 平台无关性检查由 check-tools 自动化持续保障（当前为一次性人工结论）
3. **B 仓发版** → vendored 同步流程启用（拉 A 仓 tag + 转移表一致性校验后打包，2b 数据文件即其起点）

**行为面冻结解除点**：Story 4 DONE 后，A 仓进入正常演进周期（v1.1+）。

**S2 前置**：S0 调研 opencode plugin/tool 注册 API 现状与版本锁定策略。✅ 2026-09-17 完成——插件/tool 注册（`Hooks.tool` + zod args）/permission.ask 钩子/Bun in-process 运行环境全部可行；**版本裁决（用户拍板）：V1 线 `1.18.*`（锁 major.minor，patch 浮动）+ lockfile 固化 + fence 插件加载冒烟兜底**，兼容性承诺"仅 V1 宿主 1.18.x"，V2（beta 硬断代）转正时显式立项迁移。

## v3 演进（design-four-layer.md 演进路径）

1. **试点（= S5）**：spec.md 变更式陈述 + FR 锚点；Task.yaml 手写 + 七项校验脚本；Checker 按矩阵逐条核
2. **固化（2-3 Story 后）**：changes/ 目录 + evidence 挂载；调度者产出 Task.yaml 常态化；校验脚本入库
3. **深化（结构化成熟后）**：TC 参数化可执行 + plan/apply 分离试点（人审 plan 不审 code diff）

**Story 5 spec 阶段需裁决的待定项**：叙事层 append-only 粒度 / acceptance 幂等性纪律 / FR 分型与声明式验收 / 两套状态机过渡声明 / 人审两次的审查清单重投影。

## 用户动作清单

- [x] push + 合并 Story 1（M1 生效）
- [x] GitHub 创建 OpenCodePipe 仓
- [x] 凭证落盘（~/.env）
- [ ] Story 4 实跑方案确认（候选：CRM demo Issue 级）
- [ ] Story 5 立项确认（写入 epic-spec 路线图节）

## 体系全景

```
Spec 哲学（思想根基：先规格后编码 / 注意力经济，学习了 Spec Kit 等先例）
  └─ SpecPipe（A 仓 · 方法论）✅ v1 ──vendored 引用（发版同步+转移表一致性校验）──→ OpenCodePipe（B 仓 · 工具集，OpenCode 上的最后一公里）🆕 骨架就绪
                                                                         ├─ plugin/    stage 插件（S2）
                                                                         ├─ agents/    五角色+权限（S2）
                                                                         ├─ cli/       ocp 命令 + pre-push（S3）
                                                                         ├─ check-tools/ 机械校验（S3）
                                                                         └─ configs/   转移表数据/分支策略默认值/用户配置接口/规则库（S2/3）
user-rule（个人规则+用户环境声明：模型/检索命令等用户决策项）⏳ S4 抽取 ── 按 A 仓 10-composition 组合覆盖 ──→ B 仓默认配置
旧体系 v1（本地 skill）🔄 运行中 ── S4 退役归档 ──→ 新体系 A+B 上线
```

## 档案权威说明（2026-09-16 追加）

本 Epic 工作流档案权威位置已迁至 **B 仓 `.specpipe/`**（随 git 跨机同步）。workbench 本机 `.specpipe/plans/specpipe-v2-*` 为历史副本，不再更新；后续 Story（S2 起）的档案直接产生于 B 仓目录（在 B 仓根启动 opencode 会话）。新机器环境引导见 B 仓 `docs/BOOTSTRAP.md`。
