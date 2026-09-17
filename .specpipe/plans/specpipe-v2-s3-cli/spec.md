# Spec: Story 3 —— B 仓 CLI 工具族（ocp 命令 + pre-push 强制 + check-tools）

## 背景

Epic `specpipe-v2-split` 的 Story 3，依赖 Story 2 骨架（已完成：单包工程 / 转移表数据 / stage 插件 / agents）。本 Story 交付 git 管控强制化与机械检查层——里程碑 **M2 强制层就绪** 的后半。核心命题：把 A 仓 10-composition 的编码环境规范与 09-check-split 的机械检查项，从"模型自觉"下沉为"工具强制"。

## 目标

交付五部件：① `ocp init`（铺设 `{wf}/` 目录 + vendored 模板 + pre-push hook 显式安装）② `ocp doctor`（环境自检：检索三通道**可用性发现**、git/opencode 版本、agents/plugin 安装状态——报告而非内置）③ `ocp worktree`（创建封装 + 三级分支名校验）④ pre-push hook（质量门前置强制）⑤ check-tools 五项机械检查（禁词 / 行数预算 / commit 格式 / 转移表一致性 / A 仓平台词扫描）+ Task.yaml 校验模块位预留。

## 范围

**做**：

1. **3a `ocp init`**：在目标项目铺设 `{wf}/plans/`、`{wf}/reviews/` 目录与 `.gitignore` 追加；从 vendored 副本复制 A 仓 templates 九件到 `{wf}/templates/`；pre-push hook 安装为**显式 opt-in**（`ocp init --hook` 或交互确认，不全局注入）
2. **3b `ocp doctor`**：自检并报告——git 与 opencode 版本、plugin 挂载状态（读全局/项目 opencode.json）、agents 安装状态（全局/项目目录五文件）、检索三通道配置声明与命令可用性（`which`/`--version` 探测，**发现与报告，不安装不内置**）
3. **3c `ocp worktree`**：封装 worktree 创建（专用目录约定）+ 分支名三级格式校验（目标/性质/名称，目标分支可配置）
4. **3d pre-push hook**：push 前校验工作流状态（校验语义见待澄清 1——核心：**代码变更必须来自 .stage=DONE 且 history 含质量门通过记录的 topic**）；校验失败拒绝 push 并输出原因
5. **3e check-tools**：五个独立检查命令（经 `ocp check <name>` 或独立 bin 调用）：`banned-words`（禁词扫描，词表 configs 可配置）/ `line-budget`（工件行数预算，规则按 06-artifacts 上限）/ `commit-format`（commit message 格式）/ `transition-consistency`（转移表一致性，机制见待澄清 2）/ `platform-words`（A 仓平台词扫描，词表 configs）；目录预留 Task.yaml 七项图论校验模块位（S5）
6. vendored 机制落地：A 仓 templates 九件 + 07 卷的 vendored 副本入库 `configs/vendor/specpipe/`（`source` 记 A 仓 commit；同步工具或脚本随本 Story 交付最小版）

**不做**：

- npm 公开发布与 exports 键调整（S4）
- user-rule 抽取与旧体系退役（S4）
- Task.yaml 七项校验实现（S5，仅预留模块位）
- 检索 CLI 的任何内置/封装（机制与用户决策分离原则）
- CI 建设（用户已裁决暂缓）

## 待澄清

1. **pre-push 校验语义**（本 Story 最关键设计）。推荐方案：**按 push diff 判定**——① diff 仅含 `.specpipe/**` 路径变更 → 放行（纯档案流转，spec/impl 随时推）；② diff 含 `.specpipe` 之外的变更（代码）→ diff 中出现的所有 `{topic}` 目录必须 `.stage=DONE` 且 `.stage-history` 末行含该 topic 的 `QUALITY_GATE→DONE` 转移；③ 代码变更但 diff 无任何 topic 关联 → 拒绝（要求代码变更须伴随工作流档案）。另保留 git 原生 `--no-verify` 逃生通道（不改 git 行为，文档明示）。是否同意？
2. **转移表一致性校验形态**：A 仓 07 卷是叙述性 markdown，机器解析不可靠。推荐：**vendored 哈希绑定**——`configs/vendor/specpipe/07-state-machine.md` 入库（记 A 仓 commit），`configs/transition-table.json` 的 `source` 字段扩展记录 vendored 07 卷内容哈希；`ocp check transition-consistency` 校验三件事：① vendored 07 卷哈希与 transition-table 声明一致（A 仓变更未同步会被发现）② 数据文件 schema 自校验（状态/边引用完整性、initial/terminal 存在性）③ 期望边集快照比对（S2 测试的硬编码期望集提为 configs 快照，双源对账）。是否同意？
3. **CLI 实现形态**：推荐**零依赖手写** subcommand 路由（`cli/index.ts` 解析 `process.argv`，规模四个命令不值得引 commander；bun 直跑 TS 无编译负担）。是否同意？
4. **vendored 同步机制**：推荐最小版——`scripts/vendor-sync.ts`（读本地 A 仓路径或 `--tag`，复制 templates + 07 卷进 configs/vendor/ 并更新哈希声明），发版流程手动触发。是否同意？
5. **hook 的安装位置**：推荐项目 `.git/hooks/pre-push`（`ocp init --hook` 写入，幂等覆盖 + 文件头注明由 ocp 生成）。是否同意？
