# 审查报告: stage-file-guard (Revision 2)

- **审查类型**：Issue Impl 文档审查（I-S5；rev2 复审——按 rev1 约定仅核对「问题 1 落位修复」与「问题 2 用例补充」）
- **审查对象**：`.specpipe/plans/stage-file-guard/issue-impl.md`（54 行，rev2）
- **基准材料**：rev1 报告（`reviews/stage-file-guard-issue-impl-review-20260921-1209.md`）；部署版 `~/.config/opencode/agents/oracle.md`；B 仓 `~/project/opencodepipe/agents/oracle.md` + `tests/agents-permission.test.ts`（含该文件 git 提交史）；`.stage` / `.stage-history`
- **审查前状态**：`ISSUE_IMPL_REVIEWING`（已读校验一致；`.stage-history` 4 行完整：建档 → REVIEWING → rev1 REJECT 回落 DRAFT → 重新递交 REVIEWING）
- **审查限制**：shell 白名单受限（同 rev1），事实均以 read/grep + 只读 git（status/log）取证；文档审查阶段未执行 `bun test`

## 总体评价

**通过**（rev1 必改项已实质修复；残留 2 项 low 观察，不阻断）。

rev1 问题 1 的落点失实与落位冲突已消除：技术方案 #4 重写为「两处新增而非补句」，并给出明确落点——「可调用工具」表**新增一行** + 「铁律」节**新增一条**。经与两文件实际结构逐点对照（两文件结构相同：表 L49-57 共 5 行、铁律 L76-83 共 6 条、全文 grep 无 stage 工具字样），新增落点真实存在、格式可直接追加，按字面可执行。问题 2 两条边界用例已补入；rev1 其余建议（message 实际值+修复指引、影响范围收窄）均已吸收。

残留 2 项 low（措辞与口径完善，不阻断进入编码）：① 改动点行（L34）与风险行（L54）残留旧稿「补句」措辞、改动点清单未列表新增行，与 L24「两处新增而非补句」未逐字对齐——落点已由技术方案 #4 唯一确定，无错误落位风险，建议编码时顺手统一；② 同步口径（L26）「先对齐部署版全文」与两文件实际关系不符（B 仓为**有意中性化**的源：提交 18ceea5「agents 模型举例中性化（保留用户决策位关键词）」；部署版含本地化行），字面执行有污染 B 仓之虞，建议补明示。

## 复审核验（rev1 复查口径逐项）

### 1. 问题 1（必改）落位修复 — 通过

| rev1 建议 | rev2 落位（issue-impl.md 行号） | 判定 |
|---|---|---|
| a. 「可调用工具」表新增 stage 工具行（含建档注明） | L24-25：明言「现状『可调用工具』表无 stage 工具行，工具由插件注入」→ 表**新增一行** `stage_get` / `stage_set`（注明：含建档——未建档时 to 限三初始态） | ✅ 已落位、锚点属实 |
| b. 铁律新增一条（含 Issue 升级清理例外） | L25：「铁律」节**新增一条**：`.stage` 写入一律经 `stage_set`（含建档），禁止 shell 直写（Issue 升级清理 `.stage` 属删除文件，不受限） | ✅ 已落位、措辞完整 |
| c. 两文件同步口径与顺序 | L26：B 仓（源）先对齐部署版全文 → 施加同款两处新增 → 保持源与生效位一致 | ✅ 口径已写明；表述与文件实际关系有出入（观察 ②） |

锚点实证（read/grep/只读 git）：

- 部署版 `oracle.md`：「可调用工具」表 L49-57 共 5 行（`task` / `read`·`grep`·`glob`·`list` / `edit`·`write` / `bash` / `question`），无任何 stage 工具行；「铁律」节 L76-83 共 6 条编号列表——「新增一行 / 新增一条」落点真实，表两列结构与编号列表均支持直接追加。
- B 仓 `oracle.md`：同结构（表 L49-57、铁律 L76-83）；与部署版逐行比对，差异仅 3 处（L4-5 frontmatter model/variant 占位 vs 实值、L30 路径表述、L63-64 模型举例），其余正文逐行一致。结合该文件提交史（18ceea5 中性化 + d898872 职责新增），差异属「B 仓有意中性化 + 部署版本地化」，非单向滞后。
- 守护测试 `tests/agents-permission.test.ts:120-128`：守护 B 仓 oracle.md frontmatter 占位形态（model/variant 须含「用户决策位」、禁写死选型）；`:113-118` 守护正文起始含 `08-roles.md` 声明——两处新增均不触碰。

### 2. 问题 2（建议）用例补充 — 通过

- L33 用例组已含：`from=null` 与 `from=合法态`两条 to 非法路径**分列断言** ✅；**边界回归（空 `.stage` 文件仍 `STAGE_NOT_FOUND`）** ✅；并保留 get 直写识别 / set 非法 from / 零写入断言（含 `.stage-history` 不追加）。
- 微观察（可选，编码时顺手）：L33 仅写「分列断言」未细列断言内容；rev1 建议原文含「并断言提示内容（三初始态清单 / legalSuccessors）」，建议两条路径分别校验 message 含三初始态清单（from=null 时）/ legalSuccessors（from 合法时），以确保 `initialStateNames` 真被消费。

### 3. 其余建议吸收确认 — 通过

- **message 附实际值与修复指引**：L31「message 一律附实际值与修复指引」+ 示例（实际值 `I-S3`、修复路径「修正 `.stage` 为合法常量或清理后经 `stage_set` 建档」），与 L19 getStage 侧「一律」口径自洽 ✅
- **影响范围收窄**：L42 已改为「hook-core 读 `.stage` 但仅做 `=== "DONE"` 文本判定，独立于状态常量集；check-tools 全系不读 `.stage`——两者均不受影响」✅

## 发现的问题（观察项，均不阻断）

1. 改动点行 / 风险行残留旧稿「补句」措辞，改动点清单未列表新增行 — 严重程度：low
   - 锚点：L34「…（B 仓）：铁律补句（文档，非代码）」；L54「编码时先 diff 对齐再补句」
   - 影响：与 L24「两处新增而非补句」未逐字对齐；若实施仅按改动点清单动作，可能遗漏「表新增一行」（层 2 防呆条目）——但技术方案 #4 已唯一确定落点，不产生错误落位
   - 建议：编码时统一为「表新增行 + 铁律新增条」；实施与后续质量门一致性核对以技术方案 #4 为准

2. 同步口径「先对齐部署版全文」表述不准确 — 严重程度：low
   - 锚点：L26「编码时先对齐部署版全文，再施加同款两处新增」
   - 影响：两文件差异实为「B 仓有意中性化 + 部署版本地化」（提交 18ceea5 明示「agents 模型举例中性化」「个人路径占位化」），并非 B 仓单向落后；若按字面把部署版 frontmatter/本地化行回填 B 仓，会触雷守护测试（`tests/agents-permission.test.ts:120-128`，`bun test`/fence 会红）并携入环境路径
   - 建议：L26（或风险节）补一句「B 仓保留 frontmatter 占位形态；部署版本地化行（model/variant 实值、本机路径、模型举例）不回填，仅同步正文语义后各增两处」

## 非复审范围（沿用 rev1 结论，不受 rev2 修订影响）

代码侧 4 项改动点核实、兼容性（`StageOpErrorCode` 加性扩展、`errorOutput` 零改动）、回归面（hook-core / check-tools / 存量测试）、三层缺口覆盖——rev1 已全量核实通过；rev2 未触碰代码侧方案。

## 结论

# PASS

状态：`ISSUE_IMPL_REVIEWING` → `ISSUE_IMPL_APPROVED`

> rev2 判定：必改项落位修复成立、用例补充到位；2 项 low 观察建议在编码/质量门阶段顺手处理，不阻断进入编码。
