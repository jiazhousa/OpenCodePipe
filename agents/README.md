# agents/ —— 五角色代理定义（v1 迁移资产）

五角色定义文件自 SpecPipe v1（本机 `~/.config/opencode/agents/`）迁移而来，正文原样保留，仅做五点适配（决策依据见 `.specpipe/plans/specpipe-v2-s2-core/impl.md` 决策 D10）：

1. 每文件文件头（frontmatter 后）加对口声明，指向 A 仓 `08-roles.md` 对应章节
2. `oracle.md`：frontmatter 的 `model`/`variant` 改为占位（用户决策位，示例值），不写死模型选型；正文「按 specpipe skill 的 S0→S10 阶段推进」改为按 SpecPipe 规章卷（A 仓 02-workflow / 03-story-path 等路径卷）推进
3. `explorer.md`：bash 白名单检索命令（`ws`/`exa`/`tvly`/`ctx7`）保留为示例值，文件头声明覆盖
4. `checker.md`：edit 白名单的 `**` 跨段通配与绝对路径条目（`../project/**/.specpipe/**` 等）为用户环境示例值，文件头声明覆盖
5. `checker.md`：状态转移表加注——`QUALITY_GATE → DONE` 由调度者终检汇合执行（审查者报告 PASS 后），依据 A 仓 `07-state-machine.md` 分工段

## 文件清单

| 文件 | 角色（08-roles.md 名） | mode | 权限要点 |
|---|---|---|---|
| `oracle.md` | 调度者 | primary | 模型占位（用户决策位）；全量工具 |
| `explorer.md` | 调研者 | subagent | edit/write deny；bash 白名单只读命令 |
| `checker.md` | 审查者 | subagent | edit 限 `.specpipe/reviews` 与 `.specpipe/plans/*/.stage`；bash 白名单编译/测试命令 |
| `builder.md` | 执行者 | subagent | edit/bash/write allow（纪律上仅限任务书划定的文件集与验证命令） |
| `looker.md` | 视觉解析者（可选） | subagent | 全 deny，仅 `read` 读图 |

## 安装

OpenCode 自动发现 agent 定义文件，复制到全局或项目目录即可生效：

```bash
# 全局（所有项目可用；v1 即部署于复数形态目录，本机实证）
mkdir -p ~/.config/opencode/agents
cp agents/*.md ~/.config/opencode/agents/

# 或项目级（随仓分发；单/复数两种目录形态均被宿主识别）
mkdir -p .opencode/agent
cp agents/*.md .opencode/agent/
```

> 模型选型（`oracle.md` 的 `model`/`variant` 占位）与白名单示例值（检索命令、绝对路径条目）安装后按环境填写/增删——各文件头声明已标注用户决策位。插件本地分发的 loader 备注（`~` 形态不被识别，用绝对路径或 `file://` URL）见根 README。

修改定义后跑守护测试确认权限结构未漂移：

```bash
bun test tests/agents-permission.test.ts
```
