# 新机器 Bootstrap 引导

> 目标：在全新机器上恢复 SpecPipe 工作流开发环境，可直接迭代 OpenCodePipe（B 仓）。
> 前置：git（凭据见 `~/.env` 与 `~/.git-credentials` 迁移）、[opencode](https://opencode.ai)、tmux。

## 1. 恢复工作流引擎（v1 skill，过渡期方案）

```bash
git clone https://github.com/jiazhousa/SpecPipe /tmp/SpecPipe
cd /tmp/SpecPipe && git checkout v1-final -- specpipe/ agents/
mkdir -p ~/.config/opencode/skills ~/.config/opencode/agents
cp -r specpipe/ ~/.config/opencode/skills/specpipe/
cp agents/oracle.md agents/explorer.md agents/checker.md agents/builder.md ~/.config/opencode/agents/
# 可选（Oracle 为纯文本模型时）: cp agents/looker.md ~/.config/opencode/agents/
```

> 正式安装形态将由本仓 Story 2/3 交付（`ocp init`），届时替换本节。

## 2. 克隆本仓（工作流档案随仓走）

```bash
git clone https://github.com/jiazhousa/OpenCodePipe ~/project/OpenCodePipe
```

`.specpipe/` 内含 Epic `specpipe-v2-split` 全套档案（epic-spec / roadmap / Story 1 spec+impl+等价底稿 / 全部审查报告）——**这是工作流档案权威位置**，后续 Story 的档案直接产生于本仓目录。

## 3. 外部检索三通道（调研角色用，用户自备）

检索三职责位（主搜索 / 备选搜索 / 文档查询）的职责契约见 A 仓 `08-roles.md`；**具体命令由用户自备并在用户配置中声明，本仓不内置检索脚本**（`ocp doctor` 交付后仅检测已声明命令的可用性）。参考配置：

| 职责位 | 参考命令 | 说明 |
|---|---|---|
| 主搜索 | `tvly`（`pip install tvly`，需 `TAVILY_API_KEY`）或自选 | 网络搜索主通道 |
| 备选搜索 | `exa`（自建 curl 脚本或官方 CLI）或自选 | 主通道超额时切换；兼页面正文抽取 |
| 文档查询 | `c7` / `ctx7` 或自选 | 库/框架文档查询 |

## 4. opencode 模型配置（个人配置域，不入公开仓）

`~/.config/opencode/opencode.json` 关键段（API key 自备）：

- provider：zhipuai-coding-plan（glm-5.3）、deepseek（deepseek-v4-flash）
- agent 段（subagent 模型，json 覆盖 markdown 同名字段）：
  - `explorer`: glm-5.3-flash, variant high, temperature 0.1
  - `checker`: deepseek-v4-flash, variant max, temperature 0.1
  - `builder`: glm-5.3, variant high, temperature 0.1
  - `looker`（可选）: 任意多模态模型
- permission.external_directory 白名单：`~/.local/share/opencode/worktree/**` → allow（worktree 编码所需）

## 5. 环境变量

`~/.env`（600 权限）：`GH_TOKEN=<个人访问令牌>`；shell 导出 `TAVILY_API_KEY`。

## 6. 验证

在 `~/project/OpenCodePipe` 目录启动 opencode，向调度者说"查看 roadmap，启动 Story 2"——能进入 S0 调研即环境就绪。
