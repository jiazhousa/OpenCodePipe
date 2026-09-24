# 新机器 Bootstrap 引导

> 目标：在全新机器上恢复 SpecPipe 工作流开发环境，可直接迭代 OpenCodePipe（B 仓）。
> 前置：git（凭据见 `~/.env` 与 `~/.git-credentials` 迁移）、[opencode](https://opencode.ai)、tmux、bun（任一途径：官方安装器 / `npm i -g bun` / 借用任一项目 devDep 二进制——仅本仓 `bun install` 时需要，此后 CLI 走 wrapper 不依赖全局）。
> **当前进度与继续迭代入口**：见 `.specpipe/plans/specpipe-v2-split/roadmap.md`「当前状态」节（M2 强制层已就绪，S2/S3 交付，下一步 S4）。

## 1. 恢复工作流引擎（新体系，2026-09-18 起替代 v1 skill 过渡方案）

```bash
# ① 挂载插件（按宿主版本二选一或并存，双形状入口同文件通吃）：
#    V1（1.18.x，需 ≥1.18.29）：opencode.json 的 plugin 数组 → "file:///<B仓本地路径>"（目录形态）
#    V2（2.x）：全局约定目录一条命令（per-location 实例化，目录锚自动正确；2.0.10 实证配置式键不生效）：
#      mkdir -p ~/.config/opencode/plugins
#      ln -s <B仓>/src/plugin/index.ts ~/.config/opencode/plugins/ocp-stage.ts
#      （项目级 .opencode/plugins/ 亦可，仅该项目生效）
# ② 接入五角色：复制本仓 agents/ 五件至 ~/.config/opencode/agents/ 并填环境值
#    ——完整步骤与 example 见 docs/agents-adoption.md（零模型配置即可跑，checker 建议跨家族）
# ②b 复制 checker 规则库：cp -r <B仓>/configs/review-rules ~/.config/opencode/review-rules
# ③ 装短命令：bash scripts/link-cli.sh（生成 ~/.local/bin/ocp wrapper，走本仓 devDep 的 bun；B 仓移位后重跑）
# ④ 在使用项目里：ocp init（铺设 {wf}/ 七件；--hook 可选装 pre-push）
```

> 环境自检：`ocp doctor`（插件挂载——V1 配置式与 V2 约定目录双轨识别 / agents 五件 / 模型路由建议 / 检索通道 / vendored 一致性）。v1 skill 已退役（历史存档不含于本仓）。
>
> **OpenCode 版本兼容**（详见 `.specpipe/plans/ocp-plugin-dual-compat/`）：插件入口为双形状（V1 调 `server()` / V2 调 `setup()`），1.18.31、2.0.10 与 2.0.16 三版本实机验证通过（2.0.16 复证：配置式 plugins 键仍不生效，全局约定目录 symlink 生效，stage 工具实测可用）。V2 安装：`curl -fsSL https://opencode.ai/v2/install | bash`（与 V1 同命令不并存，替换式升级）；V2 注意事项：共享后台服务持有启动时配置（改配置后重启服务或 `--standalone`）、`opencode plugin list` 不反映配置/约定目录插件加载状态（以 `ocp doctor` 为准）。

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
