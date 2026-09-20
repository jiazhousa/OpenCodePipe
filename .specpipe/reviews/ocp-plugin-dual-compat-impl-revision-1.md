# 审查报告: ocp-plugin-dual-compat — Issue Impl (Revision 1)

## 总体评价

**不通过（REJECT）**。

双形状入口本体实现正确、证据链完整：D1 loader 约束满足（入口仅 `export default`）、V1 `server()` 语义零漂移（diff 逐段核对）、V2 `setup()` 形态防御到位、两薄层描述同源、fence 四步全绿（133 用例）。实验记录与实现逐点对应，文档（BOOTSTRAP / cli-usage）与实测一致。

但 **doctor 新增的 V2 约定目录判定存在实证可复现的假阴性**：`v2ConventionMounted` 的 realpath 分支要求路径同时含小写 `opencodepipe` 与 `src/plugin`，而同一 commit 的 BOOTSTRAP 指引克隆路径为 `~/project/OpenCodePipe`（大写）——按文档操作的有效 symlink 挂载被判 WARN；且 realpath 分支（`&&`）与断链 fallback（`||`）口径不一致，同一目标「有效时 WARN、断链时 PASS」自相矛盾。另 B 仓 `AGENTS.md` 两处表述与本 Issue 交付事实相反（兼容性承诺、入口导出契约）未同步。两项修复均为一行级代码/文档改动 + 一个测试用例。

## 评分

**86 / 100**（2 medium × -5 + 2 low × -2）

## 验证记录（本审查实跑）

- **fence 四步**：typecheck PASS（1167ms）→ test PASS（**133 通过 / 0 失败 / 694 断言 / 8 文件**，342ms）→ smoke PASS（55ms）→ consistency PASS（30ms）；总 exit=0。
- **补充检查**：`ocp check whitespace` PASS（81 文件）；`transition-consistency` PASS（三层：vendored 哈希 / schema / 快照对账）；`commit-format` PASS（1 条 commit 格式合规）。
- **doctor 实测**：`[PASS] opencode-plugin：已挂载（全局·配置）`——与 `docs/cli-usage.md` L35 更新行逐字符一致。
- **边界实证矩阵**（/tmp 夹具直引 `checkPlugin`，绕开真实环境）：

  | 夹具 | 形态 | 实测 | 期望 |
  |---|---|---|---|
  | A | 有效 symlink → **大写** `OpenCodePipe` 路径（BOOTSTRAP 克隆形态） | **WARN（假阴性）** | PASS |
  | B | 有效 symlink → 小写 `opencodepipe` 路径 | PASS | PASS |
  | C | 断链 symlink → `/x/opencodepipe/...`（fallback 分支） | PASS | PASS |
  | D | 有效 symlink → 他项目 `src/plugin`（无 opencodepipe 字样） | WARN（正确拒绝） | WARN |

- **推荐修复判据实证**（两分支统一为：路径 `toLowerCase()` 含 `opencodepipe` 且原样含 `src/plugin`）：A/B/C → PASS、D → WARN，修复方向验证通过（不引入他项目误报）。

## 逐项审查记录

### 1. 双形状正确性 — PASS

- **V1 语义零漂移**：`git diff 2e3f1cf^..2e3f1cf -- src/plugin/index.ts` 逐段核对——`server()` 本体仅将两段 tool description 原文抽为 `STAGE_GET_DESC`/`STAGE_SET_DESC` 常量（字符串逐字符一致），注册面仍 `{ tool: { stage_get, stage_set } }`、wfRoot 仍取第二参 `options`（D8）、错误出口仍 `errorOutput` → `{title, output}`、zod args 未变。
- **V2 路径**：形态防御 `!ctx || typeof ctx.tool?.transform !== "function"`（L62）覆盖 1.18.31 误调（普通 object 无 transform 域）与 null/undefined 两形态；注册走 `ctx.tool.transform(editor.add)`；execute 返回 `{content}`；目录锚 `ctx.location.directory ?? process.cwd()` 并按 issue-impl 标注联调锚点 1。实验记录实验 1/2 与实现逐点对应（本审查未复跑双版本宿主，依据实验记录 + smoke 等价 stub 推演）。
- **描述同源**：两薄层共用常量，无漂移面；smoke 段 6 对 `{}` 与 `undefined` 断言不注册。

### 2. D1 loader 约束 — PASS

`src/plugin/index.ts` 运行时导出仅 `export default`（L152）；三个 interface 均无 `export` 修饰（纯类型、编译期擦除）；无任何 re-export。与注释声明的约束一致。

### 3. doctor 双轨逻辑 — 基本落位，发现问题 1

- V1 配置键：`plugin ?? plugins` 读取（L117-124）、字符串/元组/`{package}` 三形态判定（L103-114）、`项目·配置`/`全局·配置` 文案与 issue-impl 一致。
- `dirname(projectConfigPath)` 推项目根：唯一生产调用点 main L364 传 `join(ctx.cwd, "opencode.json")`，假设成立；测试同构。✓
- V2 约定目录：realpath 优先 + readlink 兜底结构正确；**判定谓词两分支不一致**（问题 1），实证矩阵 A/C 展示矛盾。

### 4. 测试覆盖 — 部分，见问题 3

- 新增 3 用例落位：plugins 键对象命中（L121-127）、约定目录 symlink 命中（L129-141）、不命中（L143-155）。
- **「命中」用例的目标 `/x/opencodepipe/src/plugin/index.ts` 不存在 → 实际走断链 fallback（readlink）分支**，realpath 成功分支零覆盖——恰是问题 1 藏身之处（夹具若用真实存在目标即会暴露）。测试名未反映断链语境。
- smoke V2 链路断言充分：注册面（名称集）、JSON Schema actor 枚举、建档/查询/跳级拒绝全链路、`{content}` 形态、双形态防御。既有 133 用例全绿，无回归。

### 5. 文档一致性 — BOOTSTRAP/cli-usage PASS；AGENTS.md 未同步（问题 2）

- BOOTSTRAP L12-14 V2 symlink 指引、L24 installer `https://opencode.ai/v2/install` + 共享后台服务/`opencode plugin list` 注意，与 experiment-record 实验 2/3、陷阱 1/2 一致；V1 ≥1.18.29 与入口注释一致。
- cli-usage L35 `已挂载（全局·配置）` 与实测输出逐字符一致。
- **B 仓 AGENTS.md 未随动**：L9「兼容性承诺仅 V1 宿主 1.18.x」、L17「入口仅导出 `ocpStagePlugin`」均与本交付事实相反（问题 2）。

### 6. 兼容边界（不改的部分）— PASS

- `git diff --stat 2e3f1cf^..2e3f1cf -- src/plugin/stage-ops.ts agents configs check-tools scripts/run-test-fence.ts` 输出为空——**零改动实证**。
- commit 文件集 = issue-impl 改动清单 + 本 topic 档案（.stage/.stage-history/experiment-record/issue-impl），无越界。
- package.json 仅加 devDep；bun.lock 固化 `@opencode/plugin@2.0.10`；入口运行时零 import 新包（grep 仅注释提及）；stage-ops 的 get/set 签名与零写入语义未受影响（既有测试全绿）。

## 发现的问题

1. **`v2ConventionMounted` realpath 分支大小写敏感 + 与 fallback 口径不一致** — 严重程度：**medium（必改）**
   - 影响：`real.includes("opencodepipe") && real.includes("src/plugin")`（doctor.ts L136）要求同时含**小写** `opencodepipe`；而 BOOTSTRAP L29 指引克隆至 `~/project/OpenCodePipe`（含大写），按文档搭建的 V2 symlink 挂载被报 WARN（实证 A）。同一路径「目标存在（realpath 分支）→ WARN、目标断链（fallback `||`，L141）→ PASS」自相矛盾（实证 A vs C）。
   - 建议：两分支统一为「路径 `toLowerCase()` 含 `opencodepipe` 且原样含 `src/plugin`」（保留对 D 类他项目 `src/plugin` symlink 的拒绝能力；该判据已实证 A/B/C PASS、D WARN）；同步补「有效 symlink → PASS」正例用例（见问题 3）。

2. **B 仓 AGENTS.md 未同步** — 严重程度：**medium（必改）**
   - 影响：AGENTS.md 为 B 仓会话注入的项目记忆——L9「兼容性承诺仅 V1 宿主 1.18.x」与本 Issue「兼容 1.18.x + 2.x」直接冲突；L17「入口仅导出 `ocpStagePlugin`」与新入口 default 对象 `{id, setup, server}` 事实相反；未来会话（含 Oracle/Builder/Checker）据其行事会被误导。
   - 建议：L9 改为双版本承诺（2.x 经约定目录挂载）；L17 改为「入口 default 对象 `{id, setup, server}`，禁止 named 运行时导出（1.18 loader 约束）」。

3. **realpath 成功分支无测试覆盖** — 严重程度：low
   - 影响：新增「约定目录命中」用例的 symlink 目标不存在，仅覆盖 fallback；若补「真实存在目标（含大写目录名）」用例即可先于本次审查抓到问题 1，当前测试给出虚假安全感。
   - 建议：随问题 1 修复补正例（tmp 目录内建真实目标文件 + symlink）。

4. **「symlink 目录」形态判定盲点（信息性）** — 严重程度：low
   - 影响：实验矩阵标注「约定目录 + symlink 目录 ✅」为可加载形态；若用户直链 B 仓根目录（realpath 不含 `src/plugin` 路径段），doctor 不命中，而 BOOTSTRAP 现推荐单文件 symlink、实验记录未标明当时链接对象，存在文档/判定边界未闭合面。
   - 建议：BOOTSTRAP 明确「推荐单文件 symlink；链接目录时须指向含 `src/plugin` 的目录」，或在判定注释中钉死所支持的形态边界。

## 必改项（REJECT 依据）

1. 修复 `cli/commands/doctor.ts` `v2ConventionMounted` 判定（问题 1：两分支统一大小写不敏感判据）+ 补有效 symlink 正例测试（问题 3）。
2. 同步 B 仓 `AGENTS.md` L9/L17 两处失效表述（问题 2）。

## 结论

# REJECT

状态：ISSUE_IMPL_REVIEWING → ISSUE_IMPL_DRAFT

> 说明：问题 3/4 为建议项，不构成独立阻断；REJECT 由必改项 1/2（均可一行级修复）驱动。核心双形状实现、D1 约束、不改变更边界、fence 与文档主体均无问题，修复后可快速复审通过。
