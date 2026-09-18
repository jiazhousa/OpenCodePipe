# Agents 接管指南（v1 旧版 → B 仓纯净源）

> 适用：把 OpenCodePipe（B 仓）`agents/` 五角色定义部署为你的 opencode 全局 agents，替代 v1 旧版。
> 部署实例一（开发机，2026-09-17，见文末记录）。

## 一、理念：纯净源 vs 部署实例

B 仓 `agents/` 是**纯净定义源**——只含角色稳定内容（职责、调度协议、权限结构、对口 A 仓规章声明），不含任何用户环境值。**你的洞察**：任务/项目相关内容全部拆出，定义才能跨项目跨人复用（"换人依然成立"测试）。

环境值共三处，部署时由你的配置承载。**模型策略（2026-09-18 拍板，参照 omo 模式）**：默认**零配置**——所有角色（含 checker）落 opencode 默认模型即可跑通；唯一值得显式配置的是 **checker 换不同家族（provider 前缀）的模型**，跨家族交叉验证是 checker 选型的核心价值（同模型自审易同盲区），`ocp doctor` 的 `agent-model` 项会在此建议缺失时 WARN 提示。

| # | 环境值 | 载体 | 必要性 |
|---|---|---|---|
| 1 | oracle 模型（主会话调度者） | `agents/oracle.md` frontmatter | 可选（默认留空=用默认模型；填写形态 `<provider>/<model>`） |
| 2 | **checker 跨家族模型**（唯一推荐配置） | `opencode.json` 的 `agent` 段 | **推荐**（与 oracle/builder 同 modelId 时 doctor WARN；其余 subagent 默认模型即可） |
| 3 | 权限白名单环境项 | 各 agent md 的 `permission` 段 | 按需（explorer 检索命令、checker 规则库路径） |
| 4 | checker 规则库部署实例 | `~/.config/opencode/review-rules/` | 部署时复制：`cp -r <B仓>/configs/review-rules ~/.config/opencode/review-rules/`（checker.md 中的引用路径，缺失则代码质量审查降级为无规则注入） |

> B 仓源中上述位置为占位注释或示例值（标注"用户决策位"），**直接复制部署时必须先填 #1**，#2/#3 按需核对。

## 二、三类产物接入总览（opencode 视角）

| 产物 | 接入方式 | 一次性/每项目 |
|---|---|---|
| **stage 状态机插件** | `opencode.json` → `"plugin": ["file:///<B仓本地路径>"]`（目录形态——宿主读 package.json 的 name 作插件名、`exports["./server"]` 作入口） | 一次（全局） |
| **agents 五角色** | 本指南：复制 + 填值 → `~/.config/opencode/agents/` | 一次（全局） |
| **CLI / pre-push** | 一次性装短命令：`ln -s <B仓>/cli/index.ts ~/.local/bin/ocp`（shebang `#!/usr/bin/env bun` 直执行）；此后每项目由 oracle 自动 `ocp doctor` + `ocp init` 铺设，无需手动 | 一次装命令；每项目自动 |

## 三、接管五步

```bash
# ① 备份现役 v1（回滚保障）
cp -r ~/.config/opencode/agents ~/.config/opencode/agents-v1-backup-$(date +%Y%m%d)

# ② 复制 B 仓五件
for a in oracle explorer checker builder looker; do
  cp ~/project/opencodepipe/agents/$a.md ~/.config/opencode/agents/$a.md
done

# ②b 复制 checker 规则库（环境值 #4）
cp -r ~/project/opencodepipe/configs/review-rules ~/.config/opencode/review-rules

# ③ 填 oracle 环境值（见 example-1，把占位行改为实值）

# ④ 核对 opencode.json agent 段（见 example-2）——v1 时代已配置则无需动

# ⑤ 验证：新开会话，agent 列表出现五角色、oracle 模型正确；跑一个小 Issue 全流程
```

## 四、Examples

### example-1：oracle.md frontmatter（部署实例，已填值）

```yaml
---
description: SpecPipe 调度者 — 工作流状态机掌控、需求访谈与拆解、spec/impl 产出、任务派发与冲突调节。
mode: primary
model: <provider>/<model>             # ← B 仓源此处为占位注释，部署时填你的模型
variant: max                           # ← 同上
permission:                            # 白名单结构为纯净内容，保留
  bash:
    "*": deny
    "git *": allow
    # ...（Git 与验证命令白名单，角色稳定内容）
---
```

### example-2：opencode.json 的 agent 段（最小配置——仅 checker，2026-09-18 策略）

```jsonc
{
  "agent": {
    "checker": { "model": "<跨家族 provider>/<model>", "variant": "max", "temperature": 0.1 }
    // 其余角色不配 = 默认模型（零配置可跑；想要精细路由再逐个加，如 builder/explorer 用低价档）
  }
}
```

> 完整路由形态（可选）：explorer/builder/looker 可按成本与能力分层选型（如调研用低价档、编码用主力档）；oracle 主定义亦可在此段（`prompt` 指向 `{file:./agents/oracle.md}`）。

### example-3：explorer 检索命令白名单定制（环境项 #3）

```yaml
permission:
  bash:
    "*": deny
    "ws": allow          # 你的双引擎检索命令（CLI，见用户全局规则 9）
    "ws *": allow
    "exa *": allow       # 单引擎直查/正文提取
    "tvly *": allow
    "ctx7 *": allow      # 库文档查询
    "git status": allow  # 只读 git
    "git log *": allow
    "git diff *": allow
    "git show *": allow
```

> 换一套检索工具（如 MCP 环境）时，只改这段，角色职责正文不动——这就是拆分的价值。

## 五、验证清单

- [ ] 五件 frontmatter YAML 可解析（`python3 -c "import yaml,re; ..."` 快速校验）
- [ ] 无占位残留：`grep -rn "<[^>]*——用户决策位" ~/.config/opencode/agents/*.md`（应无输出；注意勿用 `grep "用户决策位"`——源文件对口声明注释本身含该词，恒误报）
- [ ] 新会话 agent 列表五角色齐全，oracle 模型为实值
- [ ] 派发一个小任务（explorer 调研即可）走通

## 六、回滚

```bash
rm -rf ~/.config/opencode/agents
mv ~/.config/opencode/agents-v1-backup-YYYYMMDD ~/.config/opencode/agents
```

## 七、部署实例一记录（开发机，2026-09-17）

- 部署内容：B 仓 `9329d9d` 期五件；oracle frontmatter 填实值（用户模型）
- 与 v1 差异（语义零漂移，全为注释/声明/占位）：oracle 4 行（模型实值化 + 对口声明）、checker 4 行（对口声明 + QUALITY_GATE→DONE 终检加注）、explorer/builder/looker 各 2 行（对口声明）
- v1 备份：`~/.config/opencode/agents-v1-backup-20260917`
- opencode.json agent 段（subagent 模型路由）未动，继续生效
- 后续 B 仓 agents 演进：改源 → 重复本指南 ②③ → diff 核对（源为纯净版，diff 应只见预期变更）
