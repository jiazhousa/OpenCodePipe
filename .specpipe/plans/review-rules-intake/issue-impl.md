# Issue: review-rules 审查规则库收仓（review-rules-intake）

## 背景

- v2 裁决「review-rules+agents 归 B 仓」；agents 五件已收（`agents/`），规则库未收—— configs/README.md 已预告"自 v1 迁移"但目录不存在
- 实际触发（2026-09-18）：开发机外第二台机器部署 OpenCodePipe（清理 v1 skill → 换装 B 仓），删除 v1 skill 时 21 件规则库（20 语言规则 + system_rules.json 映射）几近丢失，手工迁至用户域 `~/.config/opencode/review-rules/` 兜底——新机器按 BOOTSTRAP.md 恢复会缺 checker 规则库
- 完整问题记录：第二台机器 `workbench/ocp-migration-issues-20260918.md` 问题 #1

## 设计决策（已与用户确认取向）

- **源收 B 仓、部署实例留用户域**：`configs/review-rules/` 为纯净源；部署时 `cp` 至 `~/.config/opencode/review-rules/`（与 agents 五件同模式：B 仓源 → 用户域部署实例）
- 否决备选「checker 直接引用 B 仓内路径」：零复制但耦合 B 仓版本/路径，违背"纯净源↔部署实例"分层
- 獬豸字段清理维持"后续项"（configs/README 原注），不在本 Issue 范围

## 动作

1. `configs/review-rules/` ← `~/.config/opencode/review-rules/`（21 件，源自 v1 skill `docs/review-rules/`）
2. `configs/README.md` 目录说明补 review-rules 条目
3. `docs/agents-adoption.md`：
   - 环境值清单补 #4（checker 规则库路径；部署动作 `cp <B仓>/configs/review-rules ~/.config/opencode/review-rules/`）
   - 接管五步补规则库复制动作
   - 「本机首例部署」→「部署实例一（开发机，2026-09-17）」（消除跨机器语境歧义）
   - 验证项 `grep -L "用户决策位"` 改为占位形态 `grep -rn "<[^>]*——用户决策位"`（原写法被源文件注释命中，恒误报）
4. `docs/BOOTSTRAP.md`：恢复步骤补 review-rules 部署来源

## 验证

- `ocp check whitespace`（新增 md 文件无尾随空白）
- `ocp check platform-words`（默认 vendored 口径不受影响，回归确认）
- 21 件文件齐全：`ls configs/review-rules | wc -l` = 21
- commit 过 `ocp check commit-format`

## 影响面

- 纯资产新增 + 文档修正，无代码逻辑改动；plugin/cli/tests 零触碰
