# OpenCodePipe

**SpecPipe 在 OpenCode 上的最后一公里**——状态机插件、五角色代理、CLI 工具族，把 [SpecPipe](https://github.com/jiazhousa/SpecPipe) 规章中的"先规格后编码"工作流变成**可强制执行**的工程制度。

> 体系三层：**Spec 哲学（思想根基）→ SpecPipe（A 仓 · 方法论，平台无关）→ OpenCodePipe（本仓 · 工具集）**。SpecPipe 定义"应该怎样"；本仓负责"强制做到"。**判断交给模型，强制交给代码。**

**当前状态**：M2 强制层就绪（本仓自身开发即在本体系上运行——自举实证）。

## 快速开始（三步）

### ① 挂载状态机插件（一次性）

`~/.config/opencode/opencode.json`：

```json
{ "plugin": ["file:///home/starlex/project/opencodepipe/src/plugin/index.ts"] }
```

重启 opencode 后，会话中获得两个工作流工具：

```
stage_get(bd-score-panel)   → "SPEC_USER_AUDIT"（读当前阶段）
stage_set(bd-score-panel, SPEC_APPROVED, 调度者)
                            → 校验转移合法性（拒绝非法跳转）+ .stage-history 留痕
```

### ② 接入五角色代理（一次性）

复制 `agents/` 五件到 `~/.config/opencode/agents/` 并填环境值（模型选型、检索命令白名单、规则库路径）——完整步骤与 example 见 [docs/agents-adoption.md](docs/agents-adoption.md)。

### ③ 在项目里启用工作流

```console
$ ln -s ~/project/opencodepipe/cli/index.ts ~/.local/bin/ocp   # 一次性装短命令
$ cd your-project
$ ocp init            # 铺 {wf}/ 七件（plans/reviews/templates/doctor-config/fence.sh...）
$ ocp doctor          # 环境自检：插件挂载/agents/检索通道/vendored 一致性
```

之后对话即可驱动工作流——"帮我做 XXX 需求"，Oracle 按 [SpecPipe 规章](https://github.com/jiazhousa/SpecPipe) 走 S0→S10/Issue 路径；`--hook` 可选加装 pre-push（见下）。

## 机制总览：六个卡点，各有把守者

| 卡点 | 把守者 | 强制方式 |
|---|---|---|
| 规格先行 | `ocp init` | 铺设工作流目录与规格模板（vendored 九件） |
| 状态纪律 | **stage 插件**（`stage_get`/`stage_set`） | 18 态转移表校验，非法转移拒绝 + JSONL 留痕 |
| 角色纪律 | `agents/` 五角色 | 权限白名单（checker 限审查目录、explorer 只读） |
| 推送纪律 | `ocp hook pre-push` | 代码变更须 topic `.stage=DONE`（Epic 豁免、fail-open） |
| 文档纪律 | `ocp check` 五项 | whitespace / line-budget / commit-format / 转移表一致性 / 平台词 |
| 环境正确 | `ocp doctor` | 二级配置自检，只报告不安装 |

另有 `ocp worktree`（三级分支名校验 `dev/feat/xxx` + 五步指引）。CLI 完整示例见 [docs/cli-usage.md](docs/cli-usage.md)。

## 机制与用户决策的边界

本仓只交付**机制**（强制、校验、铺设、自检），不封装**用户决策**：

| 归属 | 内容 | 形态 |
|---|---|---|
| 本仓（机制） | 状态转移校验、权限白名单骨架、机械检查、目录铺设、环境自检 | 代码 + 默认配置 |
| 用户决策 | 各角色模型与提供方、检索三通道命令、目录名、分支名 | 用户配置声明 + doctor 自检发现 |

检索三通道（主/备搜索、文档查询，职责契约见 A 仓 `08-roles.md`）由用户自备——**本仓不内置任何检索脚本**。

## 目录

| 目录 | 内容 |
|---|---|
| `src/plugin/` | 状态机插件（入口，`plugin/` 目录为规划说明）；`src/core/` 转移表加载与 `{wf}` 路径解析 |
| `agents/` | 五角色代理定义（纯净源，环境值占位） |
| `cli/` | `ocp` 命令族（init / doctor / worktree / check / hook） |
| `check-tools/` | 五项机械检查；预留 Task.yaml 图论校验模块位（v3） |
| `configs/` | 转移表数据文件、vendored 规章副本（`vendor/`，基线哈希声明）、规则配置 |

## 与 SpecPipe 的关系

- 规章事实源在 A 仓 [SpecPipe](https://github.com/jiazhousa/SpecPipe)；本仓以 **vendored 副本**携带契约（`configs/vendor/`，十件 sha256 声明），`scripts/vendor-sync.ts` 检测契约变更，转移表一致性进 fence 持续校验
- A 仓演进自由、B 仓锁定版本跟随：同步两段式（机械同步 + 语义适配开 Story/Issue）
- 用户规则（user-rule）按 A 仓 `10-composition.md` 组合覆盖叠加于本仓默认配置之上

## 文档

- [docs/agents-adoption.md](docs/agents-adoption.md) — 五角色接入指南（含 example 与环境值清单）
- [docs/cli-usage.md](docs/cli-usage.md) — CLI 五命令实测示例
- [docs/BOOTSTRAP.md](docs/BOOTSTRAP.md) — 新机器环境恢复引导
- [AGENTS.md](AGENTS.md) — 本仓开发记忆（SpecPipe 工作流档案见 `.specpipe/`）

## License

[MIT](LICENSE)
