# 审查报告: ocp-plugin-dual-compat — Issue Impl (Revision 2)

## 总体评价

**通过（PASS）**。

rev1 四项发现（2 medium + 2 low）全部闭环，无新问题引入：doctor V2 判定统一为大小写不敏感单判据（`hit()` 闭包，realpath 与 readlink fallback 同源），并补上直链 B 仓根目录形态；AGENTS.md L9/L17 与本交付事实同步；realpath 成功分支与目录分支均有可区分分支的真实夹具覆盖；`bun run typecheck` / `bun test`（134 用例）/ `bun run fence` 四步全绿。

## 评分

**98 / 100**（1 low × -2：测试夹具 fakeRepo 未清理；另两项为不扣分建议/观察）

## 验证记录（本审查实跑）

- **复跑三段**：`bun run typecheck` PASS（tsc 零输出）→ `bun test` PASS（**134 通过 / 0 失败 / 698 断言 / 8 文件**，273ms）→ `bun run fence` **四步全绿**（typecheck 937ms / test 297ms / smoke 50ms / consistency 27ms；summary 落 `test-fence-reports/fence-Q5pygD/summary.txt`）。
- **仓库检查**：`ocp check whitespace` PASS（81 文件）；`ocp check commit-format --range 2e3f1cf..aa64eeb` PASS（1 条）。
- **独立边界实证矩阵**（/tmp 夹具直引 `checkPlugin`，不改动仓库）：

| 夹具 | 形态 | 实测 | 期望 |
|---|---|---|---|
| A | 有效 symlink → 大写 `OpenCodePipe` 单文件（BOOTSTRAP 克隆形态） | PASS | PASS（rev1 时 WARN） |
| B | 有效 symlink → 小写 `opencodepipe` 单文件 | PASS | PASS |
| C | 断链 symlink → 小写字面单文件路径 | PASS | PASS |
| D | 有效 symlink → 他项目 `src/plugin`（无 opencodepipe 字样） | WARN | WARN（拒绝能力保留） |
| E | 有效 symlink → 大写仓库根目录 | PASS | PASS（新增直链目录形态） |
| F | 断链 symlink → 裸目录路径（无 `src/plugin` 字面） | WARN | WARN（目录形态不可 stat，注释已钉边界） |
| G | 非 symlink 真实文件（拷贝形态） | WARN | WARN（启发式不识别拷贝） |
| H | 有效 symlink → 含 opencodepipe 字样的子目录（如 docs） | PASS | （新增放宽面，见残留 2） |
| I | 有效 symlink → opencodepipe 目录下非 src/plugin 文件 | WARN | WARN |

## rev1 问题闭环核对

1. **medium 1（doctor V2 判定大小写假阴性 + 两分支口径不一致）→ 已闭环。**
   `hit()` 闭包统一判据 `lower.includes("opencodepipe") && (lower.includes("src/plugin") || statIsDir === true)`（doctor.ts L136-139）；realpath 分支（L141-148）与 readlink fallback（L151-153）同源调用。矩阵 A（原假阴性）转 PASS、C 保持 PASS，口径统一实证。附带收紧：旧 fallback 的 `||` 松判据（他项目断链 `src/plugin` 也 PASS）随统一 `&&` 消除。
2. **medium 2（AGENTS.md 未同步）→ 已闭环。**
   L9：双类型线（`@opencode/plugin 2.0.*` 仅类型零运行时依赖）+ 双版本承诺（V1 ≥1.18.29 / V2 2.x）+ 实证引用；L17：default 双形状对象 `{id, setup, server}` + 禁止 named 运行时导出约束 + V1 `server()` / V2 `setup()` 调用口径。grep 全仓：live 文档（AGENTS.md / docs / src / cli / tests）无 `ocpStagePlugin` 残留，命中仅历史档案（s2-core 的 spec/impl 与旧审查报告，属审计快照，不改）。
3. **low 3（realpath 成功分支零覆盖）→ 已闭环。**
   新用例以真实目标覆盖 realpath 成功分支：先真实 `index.ts` + symlink（文件形态），再改链真实仓库根目录（目录形态）。其中**目录形态半段为分支区分性断言**——裸目录字面走 fallback 必 WARN，断言 PASS 只能经 `realpathSync + statSync.isDirectory` 分支产生，非恒真。
4. **low 4（直链 B 仓根目录形态不命中）→ 已闭环。**
   `statSync(real).isDirectory()` 分支 + 用例（E 形态）；函数注释钉死支持形态边界：「含 `src/plugin`（单文件链接）或目标为目录（直链 B 仓根）」。

## 逐项审查记录

### 1. hit() 逻辑正确性（复审重点）— PASS

- **断链目录形态豁免**：fallback 显式传 `statIsDir=false`（无法 stat），裸目录断链 WARN（F）——注释明示「目录形态不可知，仅路径判」，边界自洽；与有效目录（E → PASS）的差异属信息不可得，非口径漂移。
- **statSync 失败（undefined）路径**：降级为仅路径判——单文件 `src/plugin` 字面仍可命中；目录形态保守 WARN。该分支实际仅在 realpath/stat 竞态（或 ACL 边界）可达，降级方向保守，无缺陷。
- **非 symlink 真实文件行为**：`realpathSync` 返回条目自身路径，要求其路径含 `opencodepipe` 且 `src/plugin`（G/I 均 WARN，无误报）；拷贝形态不被识别属启发式固有面（doctor 文案指引 symlink 形态）。
- **大小写/一致性**：`toLowerCase()` 判 opencodepipe；`src/plugin` 字面无大小写变体；realpath/fallback 两分支同源闭包，不存在 rev1 的「有效 WARN / 断链 PASS」矛盾。
- 代码阅读 + 矩阵 A–I 交叉验证，未发现新缺陷。

### 2. 新测试用例有效性 — PASS（有 1 项 low，见残留 1）

- 用例 1（有效 symlink）：projectRoot 无 opencode.json（不存在即跳过）、global 传 absent——PASS 唯一来源是 V2 约定目录分支，断言非恒真；大写克隆名（`OpenCodePipe-` 前缀）+ 真实目标同时覆盖大小写与 realpath 成功两要素。
- 用例 2（断链 fallback 正例）、用例 3（断链他项目负例）语义清晰，测试名已反映断链语境（rev1 low 3 备注的名称问题一并处理）。
- 缺口（非阻断）：realpath 成功 + 未命中的提交测试缺席（本审查矩阵 D 已实测代码行为正确）。

### 3. AGENTS.md 同步完整性 — 通过（观察项不扣分）

- L9/L17 与 issue-impl / experiment-record 事实逐点一致（≥1.18.29、双类型线、手写形状零运行时依赖、双形状调用）。
- 观察：L15「devDeps 四件套」是 Story 2 交付时点快照（package.json 现 5 件），L9 已载明新增类型线，历史段表述可接受。

### 4. 改动边界与回归面 — PASS

- aa64eeb 文件集恰为：`cli/commands/doctor.ts` + `tests/cli-doctor-worktree.test.ts` + `AGENTS.md` + 本 topic 档案（.stage / .stage-history / rev1 报告），无越界；`src/plugin/*`、agents、check-tools 等零改动（`git show --stat` 与逐段 diff 核对）。
- 回归：134 用例全绿（既有 133 + 净增 1）；fence 的 smoke（双形状链路）与 consistency（三层一致性）均 PASS；typecheck PASS。

## 残留清单

1. **测试夹具 fakeRepo 未清理 — low（-2）**
   - 用例 1 内 `mkdtemp(join(tmpdir(), "OpenCodePipe-"))` 的 fakeRepo（含 `src/plugin/index.ts`）不在 finally 清理范围（finally 仅 `rm(projectRoot)`），每次运行在 /tmp 残留一个目录；同文件其余夹具均遵循 finally / beforeEach-afterEach 清理纪律。
   - 建议：fakeRepo 置于 `base` 之下（afterEach 统一清理）或 finally 增 `rm(fakeRepo, { recursive: true, force: true })`。
2. **直链目录判定的放宽面 — 信息性（不扣分）**
   - `statIsDir === true` 使「路径含 opencodepipe 的任意真实目录」命中（矩阵 H：`.../OpenCodePipe/docs` → PASS）；若用户家目录/父路径含 opencodepipe 字样，理论存在误报面。属 rev1 问题 4 修复路线的固有成本（目标形态 = 直链 B 仓根，isDirectory 无法区分根/子目录）。
   - 可选收紧：目录分支追加 `existsSync(join(real, "src", "plugin", "index.ts"))`（E 仍命中、H 拒绝）；保持现状亦可（边界已在函数注释钉死）。
3. **观察（不扣分）**：AGENTS.md L15 四件套快照；realpath 成功负例未入提交测试（矩阵 D 已实证）。

## 结论

# PASS

状态：ISSUE_IMPL_REVIEWING → ISSUE_IMPL_APPROVED

> 档案落定说明：本轮审查开始时 `.stage` 为 `ISSUE_IMPL_DRAFT`（aa64eeb 含 rev1 落定的 DRAFT 行，复审派发时未先行推进）。按派发指令落定 `ISSUE_IMPL_APPROVED` 时，history 先补录 `DRAFT→REVIEWING`（actor=调度者，trigger 标注「补录」）再追加 `REVIEWING→APPROVED` 审查者行，保持 JSONL 链完整可验证；如调度者对本补录行有异议可调整替换。
