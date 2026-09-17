# 审查报告: specpipe-v2-s2-core — Impl (Revision 2)

## 总体评价

**通过（PASS）**。

rev1 的 15 项问题（2 high + 4 medium + 9 low）在 rev2 中逐项落位、全部吸收：

- 两项 high 已根治——工程基线补全四件套（typescript/@types/bun/bun/plugin）与 resolveJsonModule（D2/D3）、OVERTURN 四类分列定稿 25+3 边（D5，与 03/04/05 卷逐条命中）；
- 4 项 medium 已落实——计数口径定稿（18 唯一名/链位 21/Story 14/Issue 专项 5）、QUALITY_GATE→DONE actor 裁决=调度者（07 分工段为准）、D9 按宿主实证对齐（file:// 主方案 + 回退 boot 文件）、table 测试归块1 并附硬编码期望边集；
- 9 项 low 全部吸收（.gitignore 更新语义 / plugin README 指向 / loader 约束备注 / checker 示例值化 / equivalence-check 留证 / 硬编码期望边集 / 并发语义 / topic 加固 / 升级清理进 notes）。

定稿口径自身一致：25 边逐条加总 = Epic 6 + Story 14 + Issue 专项 5（逐条与 04 L27/L31-34/L52、03 L29/L35-37/L42/L52/L58-60/L66/L75/L84、05 L29/L33-35/L42、07 L45-49 核对命中，无多报、无缺漏）；18 唯一名在 D4/D5/D6 与改动点 4/5/12 间一致。三块文件集仍互不相交、依赖声明正确；D7/D8/D12 等 rev1 已通过项未被修订破坏；rev2 新增内容（D9 理由、D12 execute 冒烟、改动点 5 equivalence-check）经复核无高等级缺陷。

遗留 2 项 low（均不阻塞，见「发现的问题」）——块1 最小验证的 typecheck 步与 smoke 脚本的跨块导入交互、卷引用清单缺 05。两项均为编码派发时顺手可处理的微项，不构成 REJECT。

**审查材料**：impl.md rev2（84 行）、spec.md（40 行）、A 仓 07/03/04/05/06 卷逐条核对、rev1 报告（130 行）、B 仓 git 历史与 c6d64ed→dbf8c0d 全量 diff、B 仓现状实测（.gitignore 5 行 / 五目录 README / 根 README 目录表 / 目录骨架）、OpenCodeQuota 先例（package.json / tsconfig.json / scripts/smoke.ts / scripts/run-test-fence.ts）、v1 五 agents 现状（行数 80+172+79+83+62=476 与 rev1 审计一致）、reviews 目录 revision-2 计数确认。

## 评分

**96 / 100**（2 low × -2）

## 15 项修订核验表

| # | rev1 问题（级别） | rev2 修订落位 | 判定 |
|---|---|---|---|
| 1 | 工程基线不完整无法过 typecheck（high） | D3 四件 devDependencies（typescript 5.8.*/@types/bun 1.3.*/bun 1.3.* + plugin，对齐先例版本域）+ D2 补 `resolveJsonModule` + 依赖节 + 风险表「JSON 导入双环境」行 | **已根治** |
| 2 | SPEC_OVERTURN 口径不完整（high） | D5 四类分列：Epic REVIEWING→DRAFT(OVERTURN)、Story REVIEWING→DRAFT(OVERTURN) 补入（25+3）；D4 trigger 集含 `REJECT:SPEC_OVERTURN`；改动点 4/5/12② 计数同步 | **已根治**（03 L37 / 04 L33 / 03 L60 / 05 L35 逐条命中） |
| 3 | 计数标注不一致（medium） | D5「18 唯一名 = Epic 5 + Story 10 + Issue 专属 3；按链位计 21」；Story 14 / Issue 专项 5 / 共享尾 3 不重复声明；D6 + 改动点 12⑤ 去重语义 | **已落实** |
| 4 | QUALITY_GATE→DONE actor 未裁决（medium） | D5 actor 指派总则 + 显式裁决=调度者（07 L39 分工段为准，L49 表为辅）+ D10⑤ + 改动点 19 checker 加注 | **已落实** |
| 5 | D9 与规则 6 不符 / `~/` 不成立（medium） | D9 重写：file:// 绝对 URL 主方案（OpenCodeQuota 先例）+ `isPathPluginSpec` 识别范围备注（安装指引统一绝对路径/file://）+ 回退 boot 文件；时序节、风险表、依赖节同步 | **已落实**（附注：spec 规则 6 文本未修订，D9 以「本地目录方式范畴、非 npm 分发、意图一致」立论 + 验收 3 手验兜底——可接受） |
| 6 | 块1 最小验证引用块2 交付物（medium） | 改动点 12（tests/table.test.ts）归块1 + 块1 标题同步 + 最小验证含 `bun install`；块2 验证补 smoke | **已落实**（附注：smoke 与块1 typecheck 的交互见问题 1） |
| 7 | `.gitignore`「新建」与事实不符（low） | 改动点 3 改「更新：追加 test-fence-reports/、保留既有条目」——与现存 5 行（node_modules/dist/coverage/.env/*.log）实测一致 | **已吸收** |
| 8 | plugin README / 根 README 未同步（low） | 改动点 9：plugin/README.md 指向 `src/plugin/` + 根 README 目录表同步备注 | **已吸收** |
| 9 | loader 两条实证注意（low） | D1 备注（全部运行时导出即插件；npm 入口解析走 `exports["./server"]`→main、`./plugin` 键不参与）+ 改动点 14「入口仅此一个导出」+ 依赖节 | **已吸收** |
| 10 | checker 绝对路径白名单未示例值化（low） | D10④「绝对路径条目同样标注示例值（用户环境值，同③口径）」+ 改动点 19 | **已吸收**（备注：现 v1 源文件该条目形态为 `../project/**` 布局模式、未再见绝对路径形态；block3 按「用户环境值」一般口径覆盖即可） |
| 11 | 验收 5 留证形式未定（low） | 改动点 5：`{wf}/plans/{topic}/equivalence-check.md` 落盘（28 边逐行 + 状态 18 逐行 + 卷内出处行号）；S1 命名先例实测存在（specpipe-v2-s1-rules/equivalence-check.md） | **已吸收**（卷引用范围见问题 2） |
| 12 | 测试 14① 自证风险（low） | 改动点 12①：从 07/03/04/05 卷人工推导硬编码期望集 + 双向断言（无多边/无缺边）自证免疫；风险表同步 | **已吸收** |
| 13 | `.stage-history` 并发语义（low） | D7 写者模型（单写者假设 + appendFile/O_APPEND + 单行 ≤ PIPE_BUF）+ 风险表行 | **已吸收** |
| 14 | topic 路径边界校验（low） | D7 正则 `^[a-z0-9]+(-[a-z0-9]+)*$`（06-artifacts kebab-case）+ 改动点 7 + 改动点 16 测试（`../escape`/大写/空） | **已吸收** |
| 15 | 升级清理语义未声明（low） | D4 notes 三类语义（阻塞 / S2 重分级与中断恢复 / Issue 升级清理） | **已吸收** |

## 其余核对

### 定稿口径自身一致性 — 计数与枚举通过（卷引用范围见问题 2）
- 25 边逐条加总：Epic 6 + Story 14 + Issue 专项 5 = 25 ✓；建档 3 边（三初始态、from=null、actor=调度者、trigger=建档）✓
- 与正文各处计数一致：改动点 4（18 唯一状态 + 25 边 + 3 建档边）、改动点 5（28 边 + 18 态）、改动点 12②（25+3）；风险表引用一致 ✓
- 18 唯一名口径在 D4（schema + shared 标记）、D5（5+10+3，含共享 3 态）、D6（共享态单条声明 + 去重）间一致 ✓
- 共享尾 3 边「已含于 Story 14、Issue 链引用不重复声明」与 07 两链同名同义设计一致 ✓

### 无回归 — 通过
- 三块文件集逐文件核对仍互不相交（块1 骨架/数据/测试 13 项 + 依赖文件；块2 插件 3 项；块3 agents 7 项；改动点 12 移块1 后无交集）；块2/块3 依赖块1 的声明正确 ✓
- D7 契约（非法零写入 + 去重后继、JSONL 逐字段、zod schema）、D8 第二参数 options 透传（改动点 14 措辞已按 rev1 建议精确化）、D12 三步 fence 结构均未被修订破坏 ✓
- 附记：rev1 impl 的「check-tools/README.md 更新一行」条目在 rev2 中未保留——该目录与 README 已于仓库初始化建立，spec 规则 8 的骨架要求仍满足（cli/ 保留 README 更新），不影响文件集不相交与 S3 槽位预留。

## 发现的问题（本轮新发现，均不阻塞）

1. **块1 最小验证的 typecheck 步与 smoke 脚本存在跨块导入阻断** — 严重程度：**low**
   - 影响：`scripts/smoke-plugin.ts` 为块1 交付且需 import 块2 的插件入口（`src/plugin/index.ts`），而 tsconfig include 含 `scripts/**`——块1 按文执行 `bun run typecheck` 时，凡常规静态/字面量导入形态（D12「import 插件入口」的自然实现）均会被 tsc 解析并报找不到模块，块2 落地前块1 无法按文自验；rev1 的对应声明注记（「冒烟属块1 文件但语义依赖块2，fence 在块2 后跑」）在 rev2 中未保留。影响限于编码期自验摩擦（Builder 自修复或报 BLOCKED），不影响交付物与 fence（块2/3 后全量跑）。属 rev1 未覆盖、rev2 未引入的历史遗留。
   - 建议：将 `scripts/smoke-plugin.ts` 移入块2（其语义与块2 验证本已包含它），或在 D12/改动点 11 注明以非静态解析方式导入，或在块1 验证处注明该步以块2 后为准。

2. **卷引用清单缺 05（与改动点 12① 不一致）** — 严重程度：**low**
   - 影响：D5「精确以 07/03/04 卷逐条核对为准」、改动点 5「数据文件 ↔ 07/03/04 卷」、依赖节「03/04 路径卷（…OVERTURN 边出处…）」均未含 05；而改动点 12① 为「07/03/04/05 卷」。Issue 专项 5 边中，OVERTURN（ISSUE_IMPL_REVIEWING→ISSUE_IMPL_DRAFT）与 APPROVED→WORKING 的最精确出处为 05 卷——留证清单若按字面排除 05，Issue 行的出处标注不完整，S3e 工具化比对基线随之偏弱。
   - 建议：上述三处统一补 05（「07/03/04/05 卷」），与改动点 12① 对齐。

## 结论

# PASS

状态：IMPL_REVIEWING → IMPL_APPROVED

> 复审说明：15 项全部修订到位，两项 high 均属根治；遗留 2 项 low 不阻塞编码，建议在块1/块2 派发任务书与 equivalence-check 产出时顺手处理。附注两项（#5 spec 规则 6 文本未修订、#10 源文件形态现为 `../project/**`）已在核验表说明接受依据。
