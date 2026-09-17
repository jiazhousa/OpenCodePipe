# Spec: Story 3 —— B 仓 CLI 工具族（ocp 命令 + pre-push 强制 + check-tools）

> rev2（2026-09-17）：吸收 spec 审查 revision-1 五项——pre-push 语义重构（Epic topic 跳过/history 增强化/无关联警告化/代码判定白名单化）、init 补 fence 脚本模板、check-tools 清单对齐 09 卷（whitespace 替代 banned-words）、B 仓自装 hook 立场声明、vendor-sync 内嵌对账提醒。

## 背景

Epic `specpipe-v2-split` 的 Story 3，依赖 Story 2 骨架（已完成：单包工程 / 转移表数据 / stage 插件 / agents）。本 Story 交付 git 管控强制化与机械检查层——里程碑 **M2 强制层就绪** 的后半。核心命题：把 A 仓 10-composition 的编码环境规范与 09-check-split 的机械检查项，从"模型自觉"下沉为"工具强制"。

体系补充定性（2026-09-17 用户裁决）：A/B 两仓为**消费者责任模式**——A 仓（规范）演进完全自由；B 仓（实现）显式锁定 A 仓版本跟随（vendor-sync 拉取指定 tag），同步是 B 仓的责任；同步分两段式——机械同步（脚本）+ 语义适配（走 B 仓工作流）。

## 业务规则

1. **pre-push 校验语义（按 diff 判定，rev2 重构）**：
   - **前提**：工作流档案入库（`{wf}` 不进 `.gitignore`——B 仓自身实践模式；若用户项目选择忽略 `{wf}`，hook 自动降级为仅警告，文档明示）
   - **代码判定**：白名单模式集——`src/**`、`tests/**`、`scripts/**`、`cli/**`、`check-tools/**`、`agents/**`、`configs/**`、`package.json`、`tsconfig.json`、`bun.lock` 等源码与构建定义；`README`、`docs/**`、`*.md` 档案类不算代码（模式集可配置）
   - **①** diff 仅含档案类变更（`.specpipe/**` + 非 `src/` 等代码模式）→ 放行（spec/impl/文档随时推）
   - **②** diff 含代码变更 → 对 diff 中出现的 **Story/Issue topic**（`.specpipe/plans/{topic}/` 出现在 diff 里）校验：`.stage=DONE`（必须）；`.stage-history` 存在则核含 `QUALITY_GATE→DONE` 行（增强校验），文件不存在则放行（S2 前存量豁免）。**Epic topic 跳过**（Epic 档案为管理性产物，无 DONE 终态语义，其目录常与代码同推）
   - **③** 代码变更但 diff 无任何 topic 关联 → **WARN 放行**（输出"建议关联工作流档案"提示，不阻断——已交付 topic 的维护性修复不应被门卡死，质量由 fence 兜底）
   - 校验失败输出原因 + 指引；保留 git 原生 `--no-verify` 逃生通道（文档明示）
2. **转移表一致性 = 哈希绑定（三层）**：① vendored 副本——A 仓 07 卷与 templates 九件入库 `configs/vendor/specpipe/`（记来源 commit）；② 哈希锁——`transition-table.json` 记录 vendored 07 卷 SHA-256，校验时重算比对（篡改检测）；③ 边集快照对账——S2 测试的硬编码期望边集提为 `configs/transition-snapshot.json`，与数据文件双向比对（改边必留痕）。07 卷 ↔ 边集的语义映射由人工底稿（equivalence-check.md）承载——机器管"改没改"，人管"对不对"。
3. **一致性校验自动化挂载**：`ocp check transition-consistency` 纳入 **fence 步骤**（B 仓每次 Story 收尾必跑）；`ocp doctor` 报告 vendored 状态（锁定的 A 仓 commit + 与本地 A 仓路径差异提示）——同步滞后报警不依赖"记得才跑"。
4. **CLI 零依赖手写**：`cli/index.ts` 解析 `process.argv` 做 subcommand 路由（init / doctor / worktree / check），不引 CLI 框架；bun 直跑 TS。
5. **vendored 同步最小脚本**：`scripts/vendor-sync.ts`——读本地 A 仓路径或 `--tag`，复制 templates 九件 + 07 卷进 `configs/vendor/`，更新 `transition-table.json` 的 source 与哈希声明；**复制完成后自动运行快照对账**，07 卷变更导致边集失配时输出"契约已变，边集需人工适配（走 B 仓 Story/Issue）"并以非零退出码提醒（机械同步 ≠ 语义适配）。发版/契约变更时手动触发。
6. **hook 项目级安装 + B 仓自举**：`ocp init --hook` 写入目标项目 `.git/hooks/pre-push`（幂等覆盖，文件头注明由 ocp 生成）；显式 opt-in，不全局注入。**B 仓自身安装 hook**（自举——M2 强制层的活证据）；按规则 1 新语义，B 仓"档案+代码同推"的日常迭代不被拦截（Epic topic 跳过 + 存量豁免 + 无关联警告化）。
7. **`ocp init`**：铺设 `{wf}/plans/`、`{wf}/reviews/`；从 vendored 副本复制 templates 九件至 `{wf}/templates/`；**铺设 fence 脚本模板**（epic 明列项——目标项目可按技术栈改写的最小 fence 骨架）；`.gitignore` 追加 `test-fence-reports/` 类产物条目（幂等；**不忽略 `{wf}`**，规则 1 前提）。
8. **`ocp doctor`（发现与报告，不安装不内置）**：git / opencode 版本；plugin 挂载状态（读全局与项目 opencode.json 的 plugin 段）；agents 安装状态（五文件存在性）；检索三通道配置声明与命令可用性探测（`which` 探测，报告哪些职责位未声明/不可用）；vendored 状态（规则 3）。检查项分级 PASS/WARN/FAIL，WARN 不阻断只提示。
9. **`ocp worktree`**：封装 worktree 创建（专用目录约定可配置）+ 分支名三级格式校验（目标/性质/名称，如 `dev/feat/xxx`；目标分支集可配置，默认对齐 10-composition 三分支体系）。
10. **check-tools 五项（对齐 09 卷机械项清单）**（`ocp check <name>`，各自可单独跑）：`whitespace`（尾随空格/Tab/行尾格式检查）/ `line-budget`（工件行数预算，规则按 06-artifacts 上限）/ `commit-format`（commit message 格式校验）/ `transition-consistency`（规则 2+3）/ `platform-words`（平台词扫描，内置 opencode 专属词表 + 可扩展自定义词表——覆盖原 banned-words 场景）。目录预留 Task.yaml 七项图论校验模块位（S5 填充）。

## 验收标准

1. fence 全绿（typecheck + test + smoke + **transition-consistency** 四步）
2. `ocp init` 在空目录实跑：目录/模板/fence 模板/hook 四件铺设正确，幂等重跑无副作用
3. `ocp doctor` 实跑输出结构化报告（PASS/WARN/FAIL 分级），无安装行为
4. `ocp worktree` 分支名校验：合法三级格式通过、非法格式拒绝并给出格式说明
5. **pre-push 三情形真机验证（本地 bare 仓构造，留证据归档 topic）**：① 代码变更 + Story topic `.stage≠DONE` → push 被拒（错误含原因与指引）；② 同场景 `.stage=DONE`（含 history 行）→ 放行；③ 纯档案 push（含 Epic topic 目录变更 + 代码变更混合且 Epic topic 跳过路径）→ 放行
6. check-tools 五项各有单测：whitespace 命中/行数超限/commit 格式非法/哈希不一致（篡改 vendored 后报警）/平台词命中各 ≥1 正反用例
7. transition-snapshot.json 与 S2 数据文件对账通过（双向无缺无多）

## 范围

**做**：3a init（含 fence 脚本模板）/ 3b doctor / 3c worktree / 3d pre-push hook / 3e check-tools 五项 + Task.yaml 模块位预留；vendored 机制（副本入库 + vendor-sync 脚本 + 哈希声明 + 内嵌对账提醒）；一致性校验进 fence；S2 测试期望边集提为快照文件；B 仓自身 hook 自举安装。

**不做**：npm 发布与 exports 键调整（S4）；user-rule 抽取与退役切换（S4）；Task.yaml 七项校验实现（S5）；检索 CLI 内置（原则禁止）；CI 建设（已裁决暂缓）；B↔A 版本关联策略（S4 发布前定，roadmap 已记）。

## 关键风险

| 风险 | 缓解 |
|---|---|
| pre-push 的 diff 范围判定实现复杂度（stdin 读 ref、diff 边界形态） | 本地 bare 仓受控场景单测 + 验收 5 三情形；hook 只依赖 git 原生输出；③ 警告化降低误伤面 |
| 存量 topic 无 `.stage-history`（S2 前手写 `.stage` 时代） | history 增强化校验（存在才核行）——存量豁免进规则 1②，非静默妥协 |
| 同步滞后窗口期按旧规则运转 | fence 自动挂载一致性校验 + doctor vendored 报告（规则 3）；窗口期风险用户已知情接受（2026-09-17 风险评估） |
| 绕过 A 仓直接改 B 仓数据文件 | 边集快照对账报警（规则 2③）；工具留痕可见，不物理阻止（已接受） |
| check-tools 词表初始版不完善 | platform-words 词表可扩展（configs JSON），初版覆盖已知项，迭代成本≈0 |
| doctor 探测命令在异构环境误报 | 检查项分级，WARN 不阻断只提示 |
