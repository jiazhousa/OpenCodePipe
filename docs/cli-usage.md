# ocp CLI 使用指南（含实测示例）

> 所有示例为本机实测输出（2026-09-18，B 仓 `d898872` 期）。安装：`ln -s <B仓>/cli/index.ts ~/.local/bin/ocp`（shebang bun 直执行）。
> 退出码全命令统一：**0=成功 / 1=检查失败 / 2=用法错误**。

## `ocp init` —— 铺设工作流环境

用法：`ocp init [--hook] [--wf <工作流根>]`（默认 `--wf .specpipe`）

```console
$ cd your-project && git init
$ ocp init
[init] created {wf}/plans/
[init] created {wf}/reviews/
[init] created {wf}/templates/：复制 9 件，跳过已存在 0 件
[init] created {wf}/doctor-config.json
[init] created {wf}/fence.sh：模板已铺设（按项目技术栈改写步骤）
[init] created .gitignore：新增 test-fence-reports/
提示：编辑 .specpipe/doctor-config.json 声明检索三通道（retrieval.primary/fallback/docs）与本地 A 仓路径（localARepoPath）

$ ocp init --hook          # 可选：加装 pre-push 薄壳（幂等覆盖）
[init] created .git/hooks/pre-push：/path/your-project/.git/hooks/pre-push（幂等覆盖）
```

七件铺设物：plans/、reviews/、templates/（vendored 九件规格模板）、doctor-config.json、fence.sh、.gitignore 追加、（`--hook`）pre-push 薄壳。重复执行幂等（已存在跳过）。

## `ocp doctor` —— 环境自检（只报告不安装）

用法：`ocp doctor [--json]`；二级配置：项目级 `{wf}/doctor-config.json` → 用户级 `~/.config/opencodepipe/doctor.json`

```console
$ ocp doctor
[PASS] git：git version 2.43.0
[PASS] opencode：可用（~/.opencode/bin/opencode）
[PASS] opencode-plugin：已挂载（全局）
[PASS] agents：五文件齐全（全局）
[PASS] retrieval：主检索：ws（~/.local/bin/ws）；回退检索：exa（...）；库文档：ctx7（...）
[PASS] vendored：10 件一致（source commit：1ecfe8dd...）；本地 A 仓：<A仓本地路径>（可运行 bun scripts/vendor-sync.ts --path ... 对比同步）
汇总：PASS 6 / WARN 0 / FAIL 0
```

## `ocp worktree` —— 创建编码 worktree

用法：`ocp worktree <branch>`（三级格式强校验）

```console
$ ocp worktree feat-abc
分支名非法：须为三级格式 {目标}/{性质}/{名称}，实际：feat-abc
格式：{目标}/{性质}/{名称}——目标 ∈ [dev, rel, ms]；性质 ∈ [feat, fix, chore]；名称为 kebab-case
示例：dev/feat/bd-score-panel
（exit=2）

$ ocp worktree dev/feat/demo-x
worktree 已创建：/tmp/opencode/.ocp-worktrees/dev/feat/demo-x
分支：dev/feat/demo-x（基准：当前 HEAD（a9f30a6））
+ 后续五步工作流指引……
（exit=0）
```

## `ocp check` —— 机械检查路由（五子项）

用法：`ocp check <name> [options]`；子项：`whitespace` / `line-budget` / `commit-format` / `transition-consistency` / `platform-words`

```console
$ ocp check whitespace
whitespace 检查：PASS（扫描 59 个文件）

$ ocp check commit-format --range HEAD~3..HEAD
commit-format 检查：PASS（3 条 commit 格式合规）

$ ocp check transition-consistency
三层一致性检查：PASS        # configs 转移表 ↔ vendored 快照 ↔ S2 测试常量

$ ocp check platform-words --path ~/project/specpipe
平台词扫描：0 命中（20 文件）  # 平台无关性持续保障（对 A 仓全仓）
```

## `ocp hook pre-push` —— pre-push 校验（勿手工执行）

由 `.git/hooks/pre-push` 薄壳 exec 调用（stdin 传 ref 行）。语义：纯档案放行；代码变更须 Story/Issue topic `.stage=DONE`（history 存在则核 `QUALITY_GATE→DONE` 行）；Epic 跳过；无 topic 代码 WARN 放行；fail-open。**真机四情形实测见 [`.specpipe/plans/specpipe-v2-s3-cli/hooktest-record.md`](../.specpipe/plans/specpipe-v2-s3-cli/hooktest-record.md)**：

```
[pre-push] 拒绝：topic「demo-story」未完成质量门（.stage=WORKING，须 DONE）——完成质量门后重推，或 git push --no-verify 跳过校验
```

## 相关文档

- 命令参数速查：[`cli/README.md`](../cli/README.md)｜检查项明细：[`check-tools/README.md`](../check-tools/README.md)
- agents 接入：[`docs/agents-adoption.md`](agents-adoption.md)｜新机器引导：[`docs/BOOTSTRAP.md`](BOOTSTRAP.md)
