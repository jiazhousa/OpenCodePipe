# Agents 接管指南（v1 旧版 → B 仓纯净源）

> 适用：把 OpenCodePipe（B 仓）`agents/` 五角色定义部署为你的 opencode 全局 agents，替代 v1 旧版。
> 本机首例部署：2026-09-17（见文末记录）。

## 一、理念：纯净源 vs 部署实例

B 仓 `agents/` 是**纯净定义源**——只含角色稳定内容（职责、调度协议、权限结构、对口 A 仓规章声明），不含任何用户环境值。**你的洞察**：任务/项目相关内容全部拆出，定义才能跨项目跨人复用（"换人依然成立"测试）。

环境值共三处，部署时由你的配置承载：

| # | 环境值 | 载体 | 示例值 |
|---|---|---|---|
| 1 | **oracle 模型**（主会话调度者） | `agents/oracle.md` frontmatter | `zhipuai-coding-plan/glm-5.3` + `variant: max` |
| 2 | **subagent 模型路由**（explorer/checker/builder/looker） | `opencode.json` 的 `agent` 段 | 见下方 example |
| 3 | **权限白名单环境项** | 各 agent md 的 `permission` 段 | explorer 检索命令（ws/exa/tvly/ctx7）、checker edit 路径 |

> B 仓源中上述位置为占位注释或示例值（标注"用户决策位"），**直接复制部署时必须先填 #1**，#2/#3 按需核对。

## 二、三类产物接入总览（opencode 视角）

| 产物 | 接入方式 | 一次性/每项目 |
|---|---|---|
| **stage 状态机插件** | `opencode.json` → `"plugin": ["file:///home/starlex/project/opencodepipe/src/plugin/index.ts"]` | 一次（全局） |
| **agents 五角色** | 本指南：复制 + 填值 → `~/.config/opencode/agents/` | 一次（全局） |
| **CLI / pre-push** | 在使用项目里 `bun ~/project/opencodepipe/cli/index.ts init`（铺 `{wf}/` 目录七件，`--hook` 加装 pre-push） | 每项目 |

## 三、接管五步

```bash
# ① 备份现役 v1（回滚保障）
cp -r ~/.config/opencode/agents ~/.config/opencode/agents-v1-backup-$(date +%Y%m%d)

# ② 复制 B 仓五件
for a in oracle explorer checker builder looker; do
  cp ~/project/opencodepipe/agents/$a.md ~/.config/opencode/agents/$a.md
done

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
model: zhipuai-coding-plan/glm-5.3    # ← B 仓源此处为占位注释，部署时填你的模型
variant: max                           # ← 同上
permission:                            # 白名单结构为纯净内容，保留
  bash:
    "*": deny
    "git *": allow
    # ...（Git 与验证命令白名单，角色稳定内容）
---
```

### example-2：opencode.json 的 agent 段（subagent 模型路由）

```jsonc
{
  "agent": {
    "explorer": { "model": "zhipuai-coding-plan/glm-5.3-flash", "variant": "high" },
    "checker":  { "model": "deepseek/deepseek-flash", "variant": "max", "temperature": 0.1 },
    "builder":  { "model": "zhipuai-coding-plan/glm-5.3", "variant": "high" },
    "looker":   { "model": "zhipuai-coding-plan/glm-5.3-flash" }
    // oracle 主定义也在此段：mode/model/prompt 指向 {file:./agents/oracle.md}
  }
}
```

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
- [ ] oracle 无占位残留：`grep -L "用户决策位" ~/.config/opencode/agents/*.md`（应列出全部五件或空）
- [ ] 新会话 agent 列表五角色齐全，oracle 模型为实值
- [ ] 派发一个小任务（explorer 调研即可）走通

## 六、回滚

```bash
rm -rf ~/.config/opencode/agents
mv ~/.config/opencode/agents-v1-backup-YYYYMMDD ~/.config/opencode/agents
```

## 七、本机部署记录（2026-09-17）

- 部署内容：B 仓 `9329d9d` 期五件；oracle frontmatter 填实值（glm-5.3/max）
- 与 v1 差异（语义零漂移，全为注释/声明/占位）：oracle 4 行（模型实值化 + 对口声明）、checker 4 行（对口声明 + QUALITY_GATE→DONE 终检加注）、explorer/builder/looker 各 2 行（对口声明）
- v1 备份：`~/.config/opencode/agents-v1-backup-20260917`
- opencode.json agent 段（subagent 模型路由）未动，继续生效
- 后续 B 仓 agents 演进：改源 → 重复本指南 ②③ → diff 核对（源为纯净版，diff 应只见预期变更）
