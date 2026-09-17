# 质量门审查报告: specpipe-v2-s3-cli (Revision 1)

## 总体评价

通过（PASS）。

审查对象：B 仓 `opencodepipe` main 分支 7 commits（0b2f90f 块A → bf187d0 块D → 61c4bba 块B → 83d17db 块C → 9affa3d 摘要清理 → 54ffd2b 真机修复+hooktest-record → df78553 进入质量门），工作区干净。基准：spec.md（rev2）+ impl.md（rev2+增订，唯一事实源）+ hooktest-record.md + A 仓 06/10 卷。七项清单逐项见下，质量评分 98/100（1 项 low，无 critical/high/medium）。

## 质量评分

98 / 100

扣分：1 项 low（-2）。

## fence 结果

- 调度者 fence（54ffd2b 后执行，报告目录 `test-fence-reports/fence-bvO8mX`，2026-09-17 17:46）：**typecheck PASS / test PASS / smoke PASS / consistency PASS——四步全绿**（四份日志实读核验；consistency 步命令为 `bun cli/index.ts check transition-consistency`，输出三层 PASS，exit 0）。
- 本审查独立复跑：
  - 单元测试：**127 用例，127 通过，0 失败，0 跳过**（681 assert，8 文件，285ms）——与 fence test 日志（127/0/681）逐数一致
  - E2E 测试：不适用（本仓无 E2E 层；fence 第三/四步以 smoke + consistency 承担）
  - 合计：127 用例全绿
- vendored 跨仓实证：A 仓 HEAD `ec746ea` == `vendor.commit`；十件（07 + templates×9）A 仓 / vendored / 声明 sha256 三方逐字节一致（独立脚本复核）。

## 七项逐项结论

### 1. 实现与 impl 一致性 — PASS

改动点 1~34 全数落位（34 为调度者留证，`hooktest-record.md` 已归档）；A↔B/C 的 stub→重写交接、C→D 运行时收敛均按 impl 时序成立（D 先于 B/C 提交不影响文件级独立）。重点五项逐项核对：

- **hook 薄壳三段模板（D2）**：`cli/commands/init.ts` hookTemplate 三段（ocp 优先 → bun 回退绝对路径 → 双缺警告 exit 0）+ `git rev-parse --git-path hooks` 解析 + chmod/幂等覆盖；测试断言三段文本与可执行位，另覆盖 `core.hooksPath` 与非 git 目录两边界。
- **line-budget 按序首配（D11）**：`configs/line-budget.json` 五规则，`*-epic-spec-revision-*`（≤40）先于 `*-spec-revision-*`（≤30）；impl/issue-impl/质量门报告不配规则（不设限）；实测 `matchRule` Epic→40、Spec→30、impl 报告→null；34 行 Epic 报告与 144 行 impl 报告两反向用例在场。
- **vendor-sync 判据（D8）**：首跑「首次基线」0 退出；07 新哈希 ≠ 旧声明 → 「契约已变，边集需人工适配」1 退出（vendored 副本与声明已更新至新基线，转移表待人工重推导）；哈希未变 → 复用三层对账，失败才非零；`--tag` 失败非零 + 明确提示 + 临时目录用后即删。测试 ④a~④e 五路径全过。
- **doctor 二级配置（D15）**：项目级 `{wf}/doctor-config.json` → 用户级 `~/.config/opencodepipe/doctor.json`（项目级优先；项目级解析失败不回退、记录 error）；六检查项均函数级可测 + `--json`；实跑结构化分级（PASS 5 / WARN 1 / FAIL 0，exit 0），无安装行为。
- **fence 第四步（D18）**：`scripts/run-test-fence.ts` 追加 `consistency` 步（`bun cli/index.ts check transition-consistency`，0/1 判定）；fence 实跑四步全绿。

其他决策抽查：D3 fail-open 全路径（畸形 stdin / 全零 sha / 无 `~1` / diff 失败 → WARN 放行）；D4 白名单配置与内置默认一致性锚定单测；D5 history 双形态逐行 `JSON.parse` + 存在缺行拒 + topic 正则自 archivePrefix 派生；D13① 十件全量哈希；D14 词表对照 S1 禁词表逐类纳入（小写裸词 skill 不入默认集有配置 note 依据）；D16 铺设七件 + 幂等 + 不忽略 {wf}；D17 三级校验 / baseMap / 五步指引。

备查（不计分）：B 仓实际 `.git/hooks/pre-push` 为手工自举变体——与当前模板文本有三处差异（bun 回退路径无引号、双缺文案不同、头注释含「B 仓自举」），三段语义与退出行为等价（mode 755）。D16「仅执行 hook 安装」的执行机制为 impl rev2 已知歧义（该报告问题 3）下调度者的显式处置，功能与留证不受影响，本次接受。tsconfig include 补 `check-tools/**` 与 package.json EOF 换行为任务书授权小修，已落位。

### 2. 代码质量 — PASS

- 类型严谨：`strict` 全过；全仓（cli / check-tools / scripts / tests）无 `as any`、显式 `any`、`@ts-ignore`、`TODO/FIXME` 残留。
- 错误处理：hook 全链路 fail-open（解析 / git / IO 异常 → WARN 放行，绝不因自身故障硬阻断推送）；六处配置加载失败均回退内置默认并 WARN；doctor 解析类失败分级 WARN；vendor-sync 写回后复核（JSON.parse + 段完整性 + 哈希一致性），失败上抛非零。
- 命名与注释：全中文注释、以 D# 决策号可追溯；无死代码（`task-yaml.ts` 为 impl 明示占位；`doctor.ts` vendored 检查为块A 等价自实现——已知项，行为与块D ① 层一致，已接受）。
- **glob 转义修复质量（两 Builder 各自的修复）— 评估结论：均正确且稳健**：
  - split 方案（`whitespace.patternToRegex` / `line-budget.globToRegex`）：按 `**` 切段 → 段内转义集不含 `*` → 段内 `*`→`[^/]*` → 段间 join `.*`，结构上保证 `**` 与 `*` 不互相污染；
  - NUL 占位方案（`hook-core.globToRegExp`）：`**`→`\u0000` → 全量转义 → `\*`→`[^/]*` → NUL→`.*`。
  - 边界压测 17 例 × 3 实现共 34 项全过：`src/*/x**y*` 跨段复合、`a***b`、`*abc`、正则元字符路径（`configs/(x).json`、`a+b*c`）、根级精确文件 vs 子目录、`**` 不跨段 vs 跨段。NUL 方案对受控配置输入（JSON 模式串）健壮——NUL 字面量不可能出现，行为与 split 方案逐例一致。
  - 备查（不计分）：hook-core 与 check-tools 两模块存在三份同语义 5 行级实现（未共享 util）——按 D9「每项一个纯逻辑模块」设计可接受，后续触碰时可归并。
- OCR 抽查：无 eval/innerHTML/敏感信息/原型污染；console 输出均为 CLI 用户界面语义。

### 3. commit 信息 — PASS

7 个 commit 均中文、`<type>: <描述>` 前缀、以功能块/单职为单位，与仓库既有风格一致：

- `0b2f90f feat: Story 3 块A——CLI 骨架 + init + doctor + worktree`
- `bf187d0 feat: Story 3 块D——vendored 机制 + 转移表三层一致性`
- `61c4bba feat: Story 3 块B——pre-push hook 校验（stdin refs 解析 + hook-core 纯函数核心）`
- `83d17db feat: Story 3 块C——check-tools 四项检查 + ocp check 五子命令路由`
- `9affa3d chore: cli/index.ts hook 命令摘要清理（块B/C 交付字样移除，全部命令就位）`
- `54ffd2b fix: hook 命令接受 git 调用约定的 remote/url 位置参数（验收5真机抓出）+ 手验留证`
- `df78553 docs: Story 3 进入质量门`

`ocp check commit-format --range 5acb7a1..df78553` 实跑：7 条全合规（PASS，exit 0）。

### 4. 编译验证 — PASS

`bun run typecheck`（tsc --noEmit）— exit 0、无输出；与 fence 步 1 一致。

### 5. 受影响模块测试 — PASS

`bun test` 全量 8 文件 **127 通过 / 0 失败 / 681 断言 / 285ms**。分文件：cli-init 9、cli-doctor-worktree 40、hook-core 16、check-tools 20、transition-consistency 11、table 16、stage-ops 7、agents-permission 8。附加实跑：doctor（plain+json）exit 0；check transition-consistency / whitespace / platform-words 三项 PASS；platform-words `--path` A 仓全仓 20 个 Markdown 零命中；worktree 非法分支名 exit 2 且格式指引正确。

### 6. 测试覆盖与回归 — PASS

验收映射（2/3/4/6/7 实核，5 佐证）：

- **验收 2**（init 实跑）→ cli-init 9 用例：git init 前置实跑七件铺设、模板九件、doctor 模板结构、fence 模板逐字节一致 + 可执行、.gitignore 幂等（含无尾换行边界）、hook 三段内容、缺源失败路径、`--wf` 自定义、core.hooksPath、非 git 目录。
- **验收 3**（doctor 实跑）→ 函数级 21 用例（二级配置 3 / git+opencode 3 / plugin 3 / agents 4 / retrieval 3 / vendored 4 / 路由 1）＋本审查 CLI 实跑（plain + json）。
- **验收 4**（worktree 校验）→ `validateBranchName` test.each 17 例（4 合法 / 12 非法含大写、下划线、点号、首尾连字符、缺段、四段 + 配置派生 1）＋本审查实跑非法分支 exit 2、格式说明正确。
- **验收 6**（五项各 ≥1 正反）→ check-tools 20 + transition 11：whitespace 命中/干净、line-budget 超限/边界/144 行 impl 不误报/34 行 Epic 不误伤、commit-format 合法/非法/merge 跳过、哈希篡改（07、templates、文件缺失三路径）、平台词命中/边界不误命中/干净目录/extraWords 扩展。
- **验收 7**（快照双向）→ 篡改边用例同时断言「数据文件多出边（快照缺）」与「快照多出边」两侧；flags 篡改单独断言。
- **验收 5**（真机四情形，hooktest-record 核验）→ ① `.stage=WORKING` 拦截（原因含指引与 `--no-verify`）② DONE + history（空格/紧凑混排）放行 ③ Epic 跳过放行 ③b DONE 无质量门行拦截；与 hook-core 用例 ①②②b③③b④ 一一对应；记录含 git 传参 bug 的暴露与修复（54ffd2b 接受至多 3 参 `pre-push remote url`）。
- **回归**：S2 断言无破坏（table 16 / stage-ops 7 / agents-permission 8 全绿）；白名单优先级（agents/**、configs/vendor/**.md 判代码；docs/**.md 档案类）、topic 整目录删除豁免、纯档案放行均有用例。
- 说明（不计分）：任务书所列「cli-init 21 / doctor-worktree 28」与实际分文件数（9 / 40）为口径差——两文件合计 49 与任务书一致，hook-core 16 / check-tools 20 / transition-consistency 11 与任务书逐数吻合。

### 7. 文档归档与 AGENTS.md — PASS

- `{wf}/plans/specpipe-v2-s3-cli/`：spec.md(55) / impl.md(105) / .stage / hooktest-record.md 齐备；`{wf}/reviews/`：s3-cli spec-rev1/2、impl-rev1/2 齐备，本报告为 quality-gate-revision-1。
- 三 README 与实测对照：`bun cli/index.ts --help`、`check --help` 输出与 cli/README 命令表逐项一致；check-tools/README 五项规则与实现/配置一致；根 README `ocp stage set` 示例已校正、cli/check-tools 行已更新；{wf} 忽略降级语义（经规则③「无 topic → WARN 放行」路径实现）与 `--no-verify` 逃生说明均与代码行为一致。
- AGENTS.md：Story 3 条目尚未记录——按 A 仓 06 卷「关键 feature 记录……质量门文档归档项通过时追加」，由调度者于本报告 PASS 后追加（不计分）。
- 备注：`docs/BOOTSTRAP.md` 的「正式安装形态由 Story 2/3 交付（ocp init）届时替换」属 Story 4 退役切换范围，不归本 Story。

## 发现的问题

1. **`configs/README.md` 未随本 Story 更新** — 严重程度：low
   - 影响：该文件自仓库初始化后未再更新，仅列「状态转移表 / Git 分支策略 / 代码审查规则库（后续项）」，未覆盖本 Story 新增的 prepush-config / line-budget / commit-format / platform-words / worktree 五项配置；按目录 README 盘点配置会用缺（impl 改动点 25 的三 README 清单未含此文件）。
   - 建议：一行补充配置清单，或归口 Story 4 文档整理；不影响本 Story 交付与 PASS 结论。

## 结论

# PASS

状态：QUALITY_GATE → DONE
