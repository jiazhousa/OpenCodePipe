# Spec: Story 3 —— B 仓 CLI 工具族（ocp 命令 + pre-push 强制 + check-tools）

## 背景

Epic `specpipe-v2-split` 的 Story 3，依赖 Story 2 骨架（已完成：单包工程 / 转移表数据 / stage 插件 / agents）。本 Story 交付 git 管控强制化与机械检查层——里程碑 **M2 强制层就绪** 的后半。核心命题：把 A 仓 10-composition 的编码环境规范与 09-check-split 的机械检查项，从"模型自觉"下沉为"工具强制"。

体系补充定性（2026-09-17 用户裁决）：A/B 两仓为**消费者责任模式**——A 仓（规范）演进完全自由；B 仓（实现）显式锁定 A 仓版本跟随（vendor-sync 拉取指定 tag），同步是 B 仓的责任；同步分两段式——机械同步（脚本）+ 语义适配（走 B 仓工作流）。

## 业务规则

1. **pre-push 校验语义（按 diff 判定）**：hook 检查本次 push 的 diff——① diff 仅含 `.specpipe/**` 变更 → 放行（纯档案流转，spec/impl 随时推）；② diff 含 `.specpipe` 之外变更（代码）→ diff 中出现的所有 `{topic}` 目录必须 `.stage=DONE` 且 `.stage-history` 含该 topic 的 `QUALITY_GATE→DONE` 转移行；③ 代码变更但 diff 无任何 topic 关联 → 拒绝（代码变更须伴随工作流档案）。保留 git 原生 `--no-verify` 逃生通道（不改 git 行为，文档明示）。
2. **转移表一致性 = 哈希绑定（三层）**：① vendored 副本——A 仓 07 卷与 templates 九件入库 `configs/vendor/specpipe/`（记来源 commit）；② 哈希锁——`transition-table.json` 记录 vendored 07 卷 SHA-256，校验时重算比对（篡改检测）；③ 边集快照对账——S2 测试的硬编码期望边集提为 `configs/transition-snapshot.json`，与数据文件双向比对（改边必留痕）。07 卷 ↔ 边集的语义映射由人工底稿（equivalence-check.md）承载——机器管"改没改"，人管"对不对"。
3. **一致性校验自动化挂载**：`ocp check transition-consistency` 纳入 **fence 步骤**（B 仓每次 Story 收尾必跑）；`ocp doctor` 报告 vendored 状态（锁定的 A 仓 commit + 与本地 A 仓路径差异提示）——同步滞后报警不依赖"记得才跑"。
4. **CLI 零依赖手写**：`cli/index.ts` 解析 `process.argv` 做 subcommand 路由（init / doctor / worktree / check），不引 CLI 框架；bun 直跑 TS。
5. **vendored 同步最小脚本**：`scripts/vendor-sync.ts`——读本地 A 仓路径或 `--tag`，复制 templates 九件 + 07 卷进 `configs/vendor/`，更新 `transition-table.json` 的 source 与哈希声明；发版/契约变更时手动触发。**机械同步 ≠ 语义适配**：同步后若涉语义变更，必须开 B 仓 Story/Issue 走审查（epic 规则已补充）。
6. **hook 项目级安装**：`ocp init --hook` 写入目标项目 `.git/hooks/pre-push`（幂等覆盖，文件头注明由 ocp 生成）；显式 opt-in，不全局注入。
7. **`ocp init`**：铺设 `{wf}/plans/`、`{wf}/reviews/`；从 vendored 副本复制 templates 九件至 `{wf}/templates/`；目标项目 `.gitignore` 追加 `{wf}/` 相关条目（幂等，已存在不重复）。
8. **`ocp doctor`（发现与报告，不安装不内置）**：git / opencode 版本；plugin 挂载状态（读全局与项目 opencode.json 的 plugin 段）；agents 安装状态（五文件存在性）；检索三通道配置声明与命令可用性探测（`which` 探测，报告哪些职责位未声明/不可用）；vendored 状态（规则 3）。
9. **`ocp worktree`**：封装 worktree 创建（专用目录约定可配置）+ 分支名三级格式校验（目标/性质/名称，如 `dev/feat/xxx`；目标分支集可配置，默认对齐 10-composition 三分支体系）。
10. **check-tools 五项**（`ocp check <name>` 或独立调用，各自可单独跑）：`banned-words`（禁词扫描，词表 `configs/` 可配置）/ `line-budget`（工件行数预算，规则按 06-artifacts 上限）/ `commit-format`（commit message 格式校验）/ `transition-consistency`（规则 2+3）/ `platform-words`（平台词扫描，词表 `configs/`，默认面向 A 仓 vendored 副本与指定路径）。目录预留 Task.yaml 七项图论校验模块位（S5 填充）。

## 验收标准

1. fence 全绿（typecheck + test + smoke + **transition-consistency** 四步）
2. `ocp init` 在空目录实跑：目录/模板/hook 三件铺设正确，幂等重跑无副作用
3. `ocp doctor` 实跑输出结构化报告（各检查项 PASS/WARN/FAIL 分级），无安装行为
4. `ocp worktree` 分支名校验：合法三级格式通过、非法格式拒绝并给出格式说明
5. **pre-push 真实拦截一次未过质量门的 push（留证据）**：构造代码变更 + `.stage≠DONE` 的 topic → push 被拒（错误信息含原因）；随后 `.stage=DONE`（含 history 行）→ 同一 push 放行；纯档案 push 不受拦截——三情形各验一次，会话记录或脚本输出留证归档 topic
6. check-tools 五项各有单测：禁词命中/行数超限/commit 格式非法/哈希不一致（篡改 vendored 文件后报警）/平台词命中各 ≥1 正反用例
7. transition-snapshot.json 与 S2 数据文件对账通过（双向无缺无多）

## 范围

**做**：3a init / 3b doctor / 3c worktree / 3d pre-push hook / 3e check-tools 五项 + Task.yaml 模块位预留；vendored 机制（副本入库 + vendor-sync 脚本 + 哈希声明）；一致性校验进 fence；S2 测试期望边集提为快照文件。

**不做**：npm 发布与 exports 键调整（S4）；user-rule 抽取与退役切换（S4）；Task.yaml 七项校验实现（S5）；检索 CLI 内置（原则禁止）；CI 建设（已裁决暂缓）；B↔A 版本关联策略（S4 发布前定，roadmap 已记）。

## 关键风险

| 风险 | 缓解 |
|---|---|
| pre-push 的 diff 范围判定实现复杂度（stdin 读 ref、diff 计算的边界形态） | 用受控场景单测覆盖（验收 5 三情形）；hook 只依赖 git 原生输出 |
| 同步滞后窗口期按旧规则运转 | fence 自动挂载一致性校验 + doctor vendored 报告（规则 3）；窗口期风险用户已知情接受（2026-09-17 风险评估） |
| 绕过 A 仓直接改 B 仓数据文件 | 边集快照对账报警（规则 2③）；流程纪律——工具留痕可见，不物理阻止（已接受） |
| check-tools 词表初始版不完善 | 词表全量可配置（configs JSON），初版覆盖已知项，迭代成本≈0 |
| doctor 探测命令在异构环境误报 | 检查项分级 PASS/WARN/FAIL，WARN 不阻断只提示 |
