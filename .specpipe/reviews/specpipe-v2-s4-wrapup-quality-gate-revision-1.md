# 质量门审查报告: specpipe-v2-s4-wrapup (Revision 1)

## 总体评价

通过（PASS）。

审查对象：B 仓 `opencodepipe` commit `18ceea5`（单 commit，16 文件；工作树干净，HEAD=`18ceea5`，main 领先 origin/main 2，含前序 S4b commit）；环境层非 git 资产（A1 全局层新建 / A2 doc 瘦身）按任务书证据独立复核。基准：spec.md（rev3 终稿）+ impl.md（rev2）+ 五轮审查报告（spec rev1-3 / impl rev1-2）+ fence-wFnCPK 日志。

七项清单逐项见下；质量评分 98/100（1 项 low；无 critical/high/medium）。验收 #1/#2 为用户侧实跑项，本次以文件级核验 + 本会话注入实证替代（全局层已在本会话上下文可见）。

## 质量评分

98 / 100

扣分：1 项 low（-2）。备查项不计分（见文末「备查」）。

## fence 结果

- 调度者 fence（`test-fence-reports/fence-wFnCPK`，2026-09-18 16:38:18，commit 前 18 秒）：**typecheck / test / smoke / consistency 四步全绿**（四份日志实读核验；smoke = stage 插件 entry→execute→stage-ops 全链路 PASS；consistency = vendored 哈希 / schema / 快照对账三层 PASS）。
- 本审查独立复跑：
  - **编译**：`bun run typecheck`（tsc --noEmit）— exit 0、无输出（与 fence 步 1 一致）。
  - **单元测试**：**130 用例，130 通过，0 失败，0 跳过，688 expect，8 文件，327ms** — 与 fence test 日志（130/0/688）逐数一致。
  - **E2E 测试**：不适用（本仓无 E2E 层；fence 第三/四步以 smoke + consistency 承担）。
  - 合计：130 用例，130 通过，0 失败。
- 附加机械检查实跑：`ocp check commit-format --range 18ceea5^..18ceea5` PASS（1 条）；`ocp check line-budget` PASS（15 个工件在预算内，含本 topic spec 报告 20/17/27 行 ≤30）；`ocp check whitespace` PASS（59 文件）。

## 七项逐项结论

### 1. 实现与 impl 一致性 — PASS

A1/A2/B1-B5/C1-C3/D1 逐点核对（D3/D4 为调度者执行项，本审查复跑）：

| 点 | 核对结论 |
|---|---|
| A1 | `~/.config/opencode/AGENTS.md` 存在，14 行 = 头注释 + 十二节原文；与被删文本**逐字一致**（10 条规则逐条比对无差） |
| A2 | `~/doc/AGENTS.md` 603→591 行；十二节已删（diff 精确 -13/+1）；头部「分层说明」一行在位 |
| B1 | README L16 `file:///<B仓本地路径>`（原 `/home/starlex/...` 占位化） |
| B2 | BOOTSTRAP ①模型实值段 → 通用（`<provider>/<model>`、零配置=全默认）；②GH_TOKEN/TAVILY → 「个人凭据…按自备工具配置」；③过渡期安装节已替换（无 v1 恢复路径，安装路径 = `ocp init` 四步） |
| B3 | agents-adoption：example 与部署记录模型实值 → 占位；plugin 路径 → `<B仓本地路径>`；「本机实配历史参考」段通用化 |
| B4 | cli-usage：三处 `/home/starlex` → `~/.` / `<A仓本地路径>` |
| B5 | B 仓 AGENTS.md L35 `~/doc` → 「会话工作区不在 B 仓根时」 |
| C1 | oracle.md frontmatter `your-provider/your-model`（**「用户决策位」关键词保留**）；L63/L64 双举例均通用化（不点名任何型号） |
| C2 | looker.md L15 部署前提通用化（不点名型号） |
| C3 | tests 四对映射全覆盖（含 L364 断言同步）；「先长后短」执行结果正确（`gw/model-a-mini` 无前缀吞噬） |
| D1 | roadmap S4 行 4a/4c ✅ + 4c「全局 AGENTS.md 指引更新」落点注记；用户动作清单新增勾选条目 |
| D3 | fence 四步全绿（见上） |
| D4 | 口径终扫复跑：**B 仓 66 文件范围 0 命中**（字面口径；补充模式 qwen/kimi/zhipuai-coding-plan 亦 0）；**A 仓 22 文件项目词 0 命中** |

### 2. 代码质量 — PASS（含 1 low）

- 变更面：1 个测试文件 + 2 个 agents md，无生产逻辑。OCR 规则注入（`ts_js_tsx_jsx.md` / `default.md`）逐项过：无死代码、无 `var`/`==`/`any`、无安全面（本 Story 本身即敏感信息清理）；夹具命名与断言自说明。
- C3 语义复核（按 `cli/commands/doctor.ts` `checkModelRouting` L313-325 独立推演）：test1（checker=oracle=`gw/model-a`，builder=`gw/model-a-mini`）→ WARN 含 `oracle=gw/model-a` 且不含 `builder`；test2（checker=`other/model-b`，oracle=builder=`zhipuai/model-c`）→ PASS 含「交叉验证就绪」；test3 未动。三条用例语义保持。
- 「用户决策位」占位识别链完整：oracle.md 保留 + `doctor.ts` L277/L300 识别依赖 + `agents-permission.test` 守护断言全绿（130 用例内）。
- low 见「发现的问题」1。

### 3. commit 信息 — PASS

单 commit `chore: 内容分层清理（4a/4c）——…`：中文、`<type>: <描述>` 合规（`ocp check commit-format` PASS）、内容概述与实际 16 文件主要构成相符（净化 8 件 + roadmap + spec/impl + 5 份报告）；仓库「直接 main 迭代」约定下无分支/PR 要求。措辞小瑕见备查 2。

### 4. 编译验证 — PASS

`bun run typecheck` exit 0（见 fence 结果节）。

### 5. 受影响模块测试 — PASS

`bun test` 130/130（8 文件，327ms，688 assert）；fence test 日志同数（130/0/688）。fence smoke / consistency 日志核验通过。

### 6. 测试覆盖与回归 — PASS

- C3 改动 3 用例语义逐条推演保持（见 2）。
- line-budget 集成断言（`checkLineBudgetDir(B 仓 .specpipe)`，`tests/check-tools.test.ts` L153）在 130 用例内通过——B 仓档案（含本 topic 5 份报告）全合规。
- S2/S3 无回归：table / stage-ops / agents-permission / hook-core / check-tools / transition-consistency 全绿；`ocp check transition-consistency` 三层 PASS。
- 时序：fence-wFnCPK 完成于 commit 前 18 秒（覆盖最终工作树状态）；本审查 post-commit 复跑同样全绿。

### 7. 文档归档与 AGENTS.md — PASS

- `{wf}/plans/specpipe-v2-s4-wrapup/`：spec.md(42 行) + impl.md(58 行) 已随 commit 归档（B 仓副本仅缺 `.stage`/`.stage-history`——按设计 D5 DONE 后补；doc 工作区持 `.stage`=QUALITY_GATE + 15 行 history）。
- `{wf}/reviews/`：spec rev1/2/3（20/17/27 行，≤30 合规）+ impl rev1/2 五份已随 commit 归档；本报告为 quality-gate-revision-1（impl rev2 low#5 要求的报告随 commit 已满足；质量门报告本体与 D5 档案待收尾 commit）。
- B 仓 AGENTS.md：本 Story 条目尚未记录——按 s2/s3 先例（A 仓 06 卷「质量门文档归档项通过时追加」）由调度者于本报告 PASS 后追加（**不计分**）；要点建议见备查 5。
- 环境层（非 git）：doc 工作树 dirty 属既有在途改动（六/八节等，与 A2 目标区不相交）；A2 由用户择机 commit（impl 风险节已声明）。

## 验收标准映射（spec 6 条）

| # | 结论 | 证据 |
|---|---|---|
| 1 会话注入全局规则 | 文件级核验 ✓ | 全局文件=十二节原文；`~/.config/opencode/opencode.json` instructions 为空（无额外挂载）；**本会话上下文实证 `Instructions from: /home/starlex/.config/opencode/AGENTS.md` 注入**（用户侧新会话实跑仍为终验项） |
| 2 doc 注入不重复 | 文件级核验 ✓ | 本会话上下文 `Instructions from: /home/starlex/doc/AGENTS.md` = 一~十一节，无十二节 |
| 3 BOOTSTRAP 无 v1 恢复路径 | ✓ | 全文无 `git clone …/SpecPipe`、无 `checkout v1-final`、无 `cp … skills/` 恢复命令；安装路径 `ocp init`；仅存「已退役」状态说明 |
| 4 零残留（B + A） | ✓ | B：66 文件 0 命中（字面口径 + 补充模式）；A：22 文件 0 命中（项目词口径） |
| 5 roadmap | ✓ | S4 行 4a/4b/4c ✅ + 4c 落点注记；动作清单条目 |
| 6 fence 四步全绿 | ✓ | fence-wFnCPK 四步全绿 + 本审查复跑 typecheck/test |

## 发现的问题

1. **tests L365 注释仍用旧模型词「flash」** — 严重程度：low
   - 位置：`tests/cli-doctor-worktree.test.ts` L365：`// builder 是 flash 不同 modelId，不进冲突清单`
   - 影响：同一断言的夹具已中性化为 `gw/model-a-mini`，注释仍写「flash」（原 `glm-5.3-flash` 的残留词），与中性化目标不完全一致；不影响测试行为与验收 #4（口径词表不含 `flash`）。
   - 建议：改「builder 是 mini 变体不同 modelId」或删去「flash」。

## 备查（不计分）

1. **AGENTS.md L8「fence 三步」与现实不符**：现为四步（typecheck/test/smoke/consistency，S3 D18 起，`scripts/run-test-fence.ts` L18-24）；本 Story 范围外（B5 仅路径行），建议调度者追加 Story 记录时顺手改为「四步」。
2. commit message 尾注「三轮 spec 审查报告」未提及同包提交的两份 impl 审查报告（实际 5 份=3 spec + 2 impl）——措辞不完整，无实质影响。
3. `~/project/opencodepipe` 字面路径存于 README L34 / agents-adoption L36（钉死口径不含，属既有 home 相对惯例）；与同文件 `<B仓>` / `<B仓本地路径>` 占位用法略不一致，可选一致性收口。
4. impl.md C1 ② 行号标注（「L63 纯文本」实为 L64）为 impl rev2 已识别 low 且未修；②③有精确引文、执行结果正确，属档案性尾项。
5. AGENTS.md Story 记录待调度者 PASS 后追加，建议要点：①全局层建立（`~/.config/opencode/AGENTS.md`=十二节升格，doc 603→591 瘦身）；②B 仓净化口径（`git ls-files` 排除 `.specpipe/`/`bun.lock`/`node_modules` + 字面词表 + agents/tests 中性化保留「用户决策位」+ 占位形态 `<provider>/<model>`/`<B仓本地路径>`/`gw/model-a(-mini)` 等）；③BOOTSTRAP 安装节替换为 `ocp init` 四步；④roadmap S4 4a/4c 达成 + 4c 落点注记；⑤D5 档案终态含 `.stage-history`（保 pre-push 语义闭环）。

## 状态落定说明

PASS 判定。依 `agents/checker.md` 注与 `configs/transition-table.json` 显式裁决（`QUALITY_GATE → DONE` actor=调度者），本报告**不执行** DONE 落定——终检双 PASS（本报告 PASS + fence-wFnCPK 全绿）已齐，请调度者执行 `stage_set(specpipe-v2-s4-wrapup, DONE, 调度者)` 后继续 D5。

## 结论

# PASS

状态：QUALITY_GATE → DONE（DONE 由调度者终检汇合落定）
