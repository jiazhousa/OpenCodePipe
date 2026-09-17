# cli/ —— ocp 命令行工具族（Story 3 交付）

`cli/index.ts` 手写路由（命令表 + `process.argv` 解析，零 CLI 框架依赖，bun 直跑 TS；`bin.ocp` 入口）。退出码全命令统一：**0=成功 / 1=检查失败 / 2=用法错误**。

| 命令 | 用法 | 用途 |
|---|---|---|
| `ocp init` | `[--hook] [--wf <工作流根>]` | 铺设 `{wf}/plans/`、`{wf}/reviews/`、`{wf}/templates/`（vendored 九件）、`{wf}/doctor-config.json`、`{wf}/fence.sh` 模板、`.gitignore` 追加 fence 产物条目；`--hook` 追加安装 pre-push 薄壳（幂等覆盖） |
| `ocp doctor` | `[--json]` | 环境自检（git / opencode 与 plugin 段 / agents 五文件 / 检索三通道 / vendored 状态）；只报告不安装 |
| `ocp worktree` | `<branch>` | 创建 git worktree（三级分支名校验 `dev/feat/xxx` + 专用目录 + 五步工作流指引） |
| `ocp check` | `<name> [options]` | 机械检查路由（whitespace / line-budget / commit-format / transition-consistency / platform-words，详见 [../check-tools/README.md](../check-tools/README.md)） |
| `ocp hook` | `pre-push` | pre-push 校验入口（`.git/hooks/pre-push` 薄壳 exec 本命令；stdin refs 解析 + diff 文件集判定 + `.stage=DONE` 校验） |

## pre-push 与 `{wf}` 忽略降级语义

pre-push 校验以**工作流档案入库**为前提——`{wf}`（默认 `.specpipe/`）不进 `.gitignore`（B 仓自身实践模式：spec/impl/审查报告等档案随代码同推，是质量门留痕的载体）。

若目标项目选择忽略 `{wf}`（`.gitignore` 含 `{wf}` 条目），hook **自动降级为仅警告**：输出提示后放行，不做 DONE 校验——档案不入库则校验无从谈起，机制不强加于人（降级是显式可观察的 WARN，不是静默跳过）。

## `--no-verify` 逃生通道

紧急修复需要绕过校验时，保留 git 原生逃生通道：`git push --no-verify`。跳过是显式行为（留痕于 shell 历史与协作记录），事后应补跑 `ocp check` 与 fence 兜底。

## hook 薄壳三段（`ocp init --hook` 生成）

`.git/hooks/pre-push` 为钉死的薄壳模板（chmod +x、幂等覆盖）：`command -v ocp` 优先 `exec ocp hook pre-push`；回退 `command -v bun` 时 exec B 仓 `cli/index.ts`；均不可用则输出警告「ocp/bun 缺失，跳过工作流校验」+ exit 0——hook 故障不硬阻断推送。
