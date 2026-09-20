# 质量门审查报告: ocp-plugin-dual-compat (Revision 1)

## 总体评价

**通过（PASS）**。

审查对象：B 仓 `opencodepipe` commit 链 `2e3f1cf..629166a`（4 commits，main，本地未推送；15 文件 +1146/-33；HEAD 工作树干净、无 stash）。基线：issue-impl.md + experiment-record.md + rev1/rev2 审查报告，全部以本审查实跑复核。

核心交付（双形状插件入口 / doctor 双轨 / smoke 双链路 / 文档与 AGENTS.md 同步）逐项核实通过：V1 语义零漂移、V2 形态防御与注册链路成立、D1 loader 约束满足、rev1 两项必改与 rev2 残留 low 全部闭环。唯一扣分点为 `7c5d4a1` 带病提交（low，-2，已修复；**裁决不要求 rebase**，见问题 1 与第 1 项）。质量评分 **98/100**。

## 质量评分

98 / 100

扣分：1 项 low（-2：`7c5d4a1` 不能独立编译、测试亦红的历史过程瑕疵）。备查 7 项不计分。

## fence 结果

- 单元测试：134 用例，134 通过，0 失败，0 跳过，269ms（`test-fence-reports/fence-quDStQ/test.log` 实读；本审查独立复跑同数：134 通过 / 698 断言 / 8 文件）
- E2E 测试：不适用（本仓无 E2E 层；fence 第三/四步以 smoke + consistency 承担）
- 合计：134 用例，134 通过，0 失败
- fence 四步（本审查实跑 `npm run fence`）：typecheck PASS（968ms）/ test PASS（274ms）/ smoke PASS（50ms）/ consistency PASS（28ms）；summary=`test-fence-reports/fence-quDStQ/summary.txt`

## 验证记录（本审查实跑）

> 通道说明：checker bash 白名单无 `bun` / `git checkout`（B 仓 AGENTS.md L44 记载的已知边界），故编译/测试经 `npm run`（解析 node_modules/.bin）与 `npx bun`（本地 devDep 1.3.14）等价执行；逐 commit 抽查以 /tmp 重建态完成，全程未修改被审仓库。

| 命令 | 结果 |
|---|---|
| `npm run typecheck`（tsc --noEmit） | PASS（零输出） |
| `npm test`（bun test） | **134 pass / 0 fail / 698 expect / 8 文件 / 259ms** |
| `npm run fence` | **四步全绿**（见上节） |
| `npx bun scripts/smoke-plugin.ts` | smoke PASS（V1 server + V2 setup + 形态防御全链路） |
| `npx bun cli/index.ts doctor` | PASS 7 / WARN 0 / FAIL 0；`opencode-plugin：已挂载（全局·配置）` 与 docs/cli-usage.md 更新行一致 |
| `npx bun cli/index.ts check commit-format --range 2e3f1cf~1..HEAD` | PASS（4 条） |
| `npx bun cli/index.ts check whitespace` | PASS（81 文件） |
| `git status` / `.git/refs/stash` | 工作树干净 / 无 stash |

**逐 commit 编译+测试抽查**（重点 7c5d4a1。重建方法：`/tmp/opencode/ocp-gate-check/<commit>/` = 工作树副本 + `git show <commit>:<file>` 精确替换该 commit 的编译相关文件 + symlink `node_modules`/`.git`；2e3f1cf、aa64eeb 相对 HEAD 的编译相关差异仅 doctor.ts 与测试文件，替换可完整还原该 commit 代码态）：

| commit | typecheck | bun test | 结论 |
|---|---|---|---|
| 2e3f1cf | PASS | 133 pass / 0 fail | ✅ 独立编译+测试通过 |
| aa64eeb | PASS | 134 pass / 0 fail | ✅ 独立编译+测试通过 |
| 7c5d4a1 | **FAIL（TS2304 Cannot find name 'fakeRepo'，tests/cli-doctor-worktree.test.ts:153）** | **133 pass / 1 fail（ReferenceError: fakeRepo is not defined）** | ❌ 带病提交（问题 1） |
| 629166a（=HEAD） | PASS | 134 pass / 0 fail | ✅ 修复闭环 |

**夹具清洁性实证**：HEAD 复跑测试前后 `/tmp/OpenCodePipe-*` 计数 11 → 11（零新增，rev2 low 修复真实生效）；存量 11 个为 pre-fix 时期运行残留（14:57–15:05，含本审查抽查 3 个）。

**范围说明**：实机 1.18.31 / 2.0.10 双宿主验证以 experiment-record（宿主级 MARK 观测）为依据 + smoke 等价 stub 独立复跑推演；本审查未复跑 V2 双版本宿主（临时 binary 环境不可复现，且 checker 通道限制）。

## 四项清单逐项结论

（与 A 仓 09 七项映射：1↔③，2↔①②，3↔⑤⑥，4↔⑦ Issue 跳过）

### 1. commit 信息与编译/测试验证 — 有条件 PASS（1 项 low，见问题 1）

- **消息**：4 条均 `<type>: <中文描述>`、与仓库既有风格一致（`ocp check commit-format` PASS）；629166a 如实记录根因与教训「验证命令禁用管道尾巴判退出码」。
- **逐 commit**：3/4 独立编译+测试通过；`7c5d4a1` 双红（实测），33 秒后由 629166a 修复；HEAD 全绿。
- **带病提交裁决（重点）：接受「诚实记录 + 下 commit 立即修复」，不要求 rebase。** 理由：
  1. 缺陷仅存在于中间态、仅测试代码一处声明作用域问题，从未进入可交付产物；修复在紧邻 commit 完成，HEAD 四步全绿；
  2. A 仓规则原文（05-issue-path L45「每个 commit 能独立编译」/ 10-composition L57）是编码整备纪律，未规定以历史重写补救；09-check-split 质量门检查项本身为「commit 信息」+「整体编译」，后者已通过；
  3. 该链虽为本地未推送 main（B 仓「直接 main 迭代」约定），但 review 报告与 .stage-history 已引用 `aa64eeb` 等 hash——重写历史将破坏审计链引用并抹掉教训记录，与审计链完整可验证原则相悖；
  4. 记录瑕疵（非隐匿）：629166a 只记载 typecheck 被管道吞码，未提及 bun test 同红——事实应一并记录，但不改变根因与处置；
  5. 若未来该链推送并引入 per-commit CI/bisect 要求，是否重写由用户决定（届时需同步处理档案中的 hash 引用）。
- **加固建议**：验证命令一律不得以管道尾巴判退出码（`set -o pipefail` 或直取 `$?`）——已入 629166a 教训；本仓 fence 直跑模式不受影响。

### 2. 代码质量（OCR 流水线）— PASS

- **规则注入**：`ts_js_tsx_jsx.md`（4 个 .ts 变更文件）、`package_json.md`（package.json）。
- **逐文件**：
  - `src/plugin/index.ts`：仅 default 运行时导出（D1 满足）；V1 `server()` 语义零漂移（描述文本抽常量后逐字符一致、注册面/错误出口/wfRoot 第二参取值不变；stage-ops.ts 零改动）；V2 `setup()` 形态防御覆盖 null 与非 V2 ctx、JSON Schema input、`{content}` 返回、目录锚降级 `process.cwd()`；手写形状零运行时依赖新包（全仓无 `@opencode/plugin` 值导入）。
  - `cli/commands/doctor.ts`：`hit()` 闭包单一判据、realpath 与 readlink fallback 同源；stat 失败降级保守；异常全捕获不影响其余检查项；V1/V2 命中文案区分。
  - `scripts/smoke-plugin.ts`：双链路断言 + try/finally 清理。
  - `tests/cli-doctor-worktree.test.ts`：四形态断言；分支区分性成立（目录形态 PASS 只能经 `realpathSync + statSync.isDirectory` 分支产生——裸目录字面走 fallback 必 WARN）。
- 未发现死代码 / `any` / `var` / `==` / 嵌套三元 / 硬编码业务值 / 安全面问题；复杂逻辑注释充分。无新增必改问题；放宽面与边角见备查。

### 3. 测试用例覆盖与回归 — PASS

- 134/134 全绿（2e3f1cf 净增 3 用例 130→133；aa64eeb 扩写 1 用例并净增 1（断链 fallback）→134；HEAD 稳定 134）；既有断言语义保持、无删减。
- 新增测试有效性：大写克隆名（大小写不敏感）、真实文件 + 真实目录（realpath 成功分支）、断链（readlink fallback）、他项目负例（拒绝能力保留）；smoke 覆盖 V2 注册面 / JSON Schema actor 枚举 / 建档-查询-跳级拒绝全链路 / 双形态防御。
- 回归：stage-ops / table / transition-consistency / hook-core / check-tools / agents-permission / cli-init 全绿；fence consistency 三层 PASS；无破坏。
- 清洁性：HEAD 零泄漏（夹具计数实证）。

### 4. 档案完整性（Issue 口径；A 仓 09 第 7 项跳过）— PASS

- `{仓}/.specpipe/plans/ocp-plugin-dual-compat/`：`issue-impl.md`（59 行，≤80 合规）+ `experiment-record.md`（56 行）+ `.stage` + `.stage-history`（7 行）；history 逐行 JSONL 合法、转移链完整（null→ISSUE_IMPL_DRAFT→…→QUALITY_GATE，第 4 行「补录」已注明，其余与转移表边一一对应）；随 2e3f1cf / aa64eeb / 7c5d4a1 三次 commit 入库。
- `{仓}/.specpipe/reviews/`：rev1（96 行）、rev2（84 行）已入库；本报告为 `-quality-gate-revision-1.md`。
- 边界：issue-impl 留仓 `.specpipe/`（未进 `docs/`）；`docs/` 仅 BOOTSTRAP / cli-usage 通用安装说明更新——符合 Issue 口径。

## 发现的问题

1. **`7c5d4a1` 不能独立编译、测试亦红（带病提交；已修复）** — 严重程度：**low（-2，历史过程瑕疵）**
   - 证据：typecheck `TS2304: Cannot find name 'fakeRepo'`（tests/cli-doctor-worktree.test.ts:153）；bun test 133 pass / 1 fail（finally 内 `rm(fakeRepo)` ReferenceError，声明仍在 try 块内）。
   - 影响：中间提交不可独立编译/测试（A 仓 05 卷纪律违反）；对最终交付零影响（629166a 33 秒后修复，HEAD 四步全绿）。
   - 处置：**可接受，不要求 rebase**（裁决理由见第 1 项）；记录修正：该次验证缺失实际同时吞掉 typecheck 与 test 两处红，629166a message 仅记载前者。
   - 闭环：629166a 将 `fakeRepo` 声明提至 try 外 + finally 清理；HEAD 复跑零泄漏（实证）。

（无 critical / high / medium；无必改项）

## 备查（不计分）

1. devDep `@opencode/plugin@2.0.*` 当前无源码消费者（全仓仅注释提及），lockfile +549 行引入较大传递树——设计意图为 V2 类型线锚定；可选改进：`import type` 绑定官方类型（编译期擦除、零运行时）或将版本线落为文档引用。
2. doctor V2 目录判定放宽面（rev2 已述）：路径含 `opencodepipe` 的任意真实目录命中（如 `<仓>/docs`）；边界已在函数注释钉死，可选收紧 `existsSync(join(real,"src","plugin","index.ts"))`。
3. `readPluginConfig` 的 `??` 语义：`plugin` 键存在但形态非法时不回退 `plugins` 键（V2 正式版前瞻面，当前无实际影响）。
4. wfRoot 归一化表达式在 `setup`/`server` 两处重复（各 1 行），与「描述文本抽常量同源」策略略不对称，可抽 helper。
5. AGENTS.md L15「devDeps 四件套」为 Story 2 时点快照（现 5 件）；L9 已载明 V2 类型线，历史段保留可接受。
6. 机器残留：`/tmp/OpenCodePipe-*` 11 个（pre-fix 运行残留 8 + 本审查抽查 3）；HEAD 复跑零新增，可选清理。
7. 联调锚点 2 项（V2 正式版多 workspace 目录语义 / plugins 键转正后 doctor 简化）已在 issue-impl 记录，待 V2 正式版复核。

## 状态落定说明

PASS 判定 + fence 全绿 = 终检双 PASS。按调度者派发指令代写：`.stage` `QUALITY_GATE` → `DONE`；`.stage-history` 追加 `{"from":"QUALITY_GATE","to":"DONE","actor":"调度者","trigger":"质量门PASS"}`（转移表该边 actor=调度者，checker 代笔不改 actor 归属；依据 A 仓 09「审查者写报告 + 更新 .stage → DONE」+ B 仓 AGENTS.md 显式裁决）。上述两项及本报告为工作树未提交变更，待调度者收尾 commit。

## 结论

# PASS

状态：QUALITY_GATE → DONE
