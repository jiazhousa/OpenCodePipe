# 新机器 Bootstrap 引导

> 目标：在全新机器上恢复 SpecPipe 工作流开发环境，可直接迭代 OpenCodePipe（B 仓）。
> 前置：git（凭据见 `~/.env` 与 `~/.git-credentials` 迁移）、[opencode](https://opencode.ai)、tmux。
> **当前进度与继续迭代入口**：见 `.specpipe/plans/specpipe-v2-split/roadmap.md`「当前状态」节（M2 强制层已就绪，S2/S3 交付，下一步 S4）。

## 1. 恢复工作流引擎（新体系，2026-09-18 起替代 v1 skill 过渡方案）

```bash
# ① 挂载插件：opencode.json 的 plugin 数组 → "file:///<B仓本地路径>"（目录形态）
# ② 接入五角色：复制本仓 agents/ 五件至 ~/.config/opencode/agents/ 并填环境值
#    ——完整步骤与 example 见 docs/agents-adoption.md（零模型配置即可跑，checker 建议跨家族）
# ③ 装短命令：ln -s <B仓>/cli/index.ts ~/.local/bin/ocp
# ④ 在使用项目里：ocp init（铺设 {wf}/ 七件；--hook 可选装 pre-push）
```

> 环境自检：`ocp doctor`（插件挂载/agents 五件/模型路由建议/检索通道/vendored 一致性）。v1 skill 已退役（历史存档不含于本仓）。

## 2. 克隆本仓（工作流档案随仓走）

```bash
git clone https://github.com/jiazhousa/OpenCodePipe ~/project/OpenCodePipe
```

`.specpipe/` 内含 Epic `specpipe-v2-split` 全套档案（epic-spec / roadmap / Story 1 spec+impl+等价底稿 / 全部审查报告）——**这是工作流档案权威位置**，后续 Story 的档案直接产生于本仓目录。

## 3. 外部检索三通道（调研角色用，用户自备）

检索三职责位（主搜索 / 备选搜索 / 文档查询）的职责契约见 A 仓 `08-roles.md`；**具体命令由用户自备并在用户配置中声明，本仓不内置检索脚本**（`ocp doctor` 交付后仅检测已声明命令的可用性）。参考配置：

| 职责位 | 参考命令 | 说明 |
|---|---|---|
| 主搜索 | 自选（如 `tvly` 等 CLI，自备 API key） | 网络搜索主通道 |
| 备选搜索 | `exa`（自建 curl 脚本或官方 CLI）或自选 | 主通道超额时切换；兼页面正文抽取 |
| 文档查询 | `c7` / `ctx7` 或自选 | 库/框架文档查询 |

## 4. opencode 模型配置（个人配置域，不入公开仓）

`~/.config/opencode/opencode.json` 关键段（API key 自备）：

- provider：自备（`<provider>/<model>` 按个人选择配置）
- agent 段（subagent 模型，json 覆盖 markdown 同名字段，零配置=全默认模型）：
  - `checker`（唯一推荐显式配置）：与 oracle/builder 不同家族（provider 前缀）的模型——交叉验证价值
  - `explorer` / `builder` / `looker`（可选）：按成本/能力分层自选
- permission.external_directory 白名单：`~/.local/share/opencode/worktree/**` → allow（worktree 编码所需）

## 5. 环境变量

`~/.env`（600 权限）存放个人凭据：git 远端访问令牌、检索工具 API key 等，按自备工具配置。

## 6. 验证

在 `~/project/OpenCodePipe` 目录启动 opencode，向调度者说"查看 roadmap，启动 Story 2"——能进入 S0 调研即环境就绪。
