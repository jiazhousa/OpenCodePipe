# SpecPipe v2 → v3 Roadmap

> 维护于 Epic specpipe-v2-split 档案；Story 状态与 epic-spec.md 同步更新。v3 部分依据 assets/design-four-layer.md（四层工作流设计）。

## 当前状态（2026-09-16）

- **M1 规章冻结 ✅**：A 仓 SpecPipe v1 已合并 main（`2b21dfb → 6e18647`），12 文件 1028 行，质量门 92/100
- B 仓 OpenCodePipe 已 init（root commit `5ed3e28`：README + 目录骨架 + License）
- 凭证：`~/.env`（GH_TOKEN）+ `~/.git-credentials`（git 自动认证）

## v2 拆分（Epic specpipe-v2-split，进行中）

| Story | 内容 | 状态 | 里程碑 |
|---|---|---|---|
| S1 | A 仓规章 v1 | ✅ DONE | M1 规章冻结 |
| S2 | B 仓核心：TS 骨架（预留 cli/check-tools 槽位）+ stage 插件（07 契约数据文件加载）+ agents 迁移 + 权限白名单 | ⏳ 待启动 | M2 |
| S3 | B 仓 CLI：ocp init/doctor/worktree + pre-push 强制 + check-tools（预留 Task.yaml 校验位） | ⏳ 依赖 S2 骨架 | **M2 强制层就绪** |
| S4 | 组合验收：user-rule 抽取 + CRM demo Issue 级实跑 + 旧 skill 退役 | ⏳ 依赖 S2+S3 | **M3 切换完成 → ALL_DONE** |
| S5 | 四层试点（候选，待立项确认）：变更式 spec + FR 锚点 + Task.yaml 手写 + 校验脚本 + A 仓 v1.1（修订 02/03/06/07 卷） | 🆕 建议 | M4 v3 起点 |

**行为面冻结解除点**：Story 4 DONE 后，A 仓进入正常演进周期（v1.1+）。

**S2 前置**：S0 调研 opencode plugin/tool 注册 API 现状与版本锁定策略。

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
SpecPipe（A 仓 · 规章）✅ v1 ──vendored 引用（发版同步+转移表一致性校验）──→ OpenCodePipe（B 仓 · 实现）🆕 骨架就绪
                                                                        ├─ plugin/    stage 插件（S2）
                                                                        ├─ agents/    五角色+权限（S2）
                                                                        ├─ cli/       ocp 命令 + pre-push（S3）
                                                                        ├─ check-tools/ 机械校验（S3）
                                                                        └─ configs/   转移表数据/分支策略/规则库（S2/3）
user-rule（个人规则）⏳ S4 抽取 ── 按 A 仓 10-composition 组合覆盖 ──→ B 仓默认配置
旧体系 v1（本地 skill）🔄 运行中 ── S4 退役归档 ──→ 新体系 A+B 上线
```

## 档案权威说明（2026-09-16 追加）

本 Epic 工作流档案权威位置已迁至 **B 仓 `.specpipe/`**（随 git 跨机同步）。workbench 本机 `.specpipe/plans/specpipe-v2-*` 为历史副本，不再更新；后续 Story（S2 起）的档案直接产生于 B 仓目录（在 B 仓根启动 opencode 会话）。新机器环境引导见 B 仓 `docs/BOOTSTRAP.md`。
