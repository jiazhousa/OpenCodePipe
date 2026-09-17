# 审查报告: specpipe-v2-s3-cli (Revision 1)

## 总体评价
不通过。3a-3e 与 roadmap 对齐、边界与验收可核验性基本达标；但 pre-push 判定规则（业务规则 1）与档案形态/迁移期实况冲突，须修订后复审。

## 分项意见
1. 范围对齐：五部件与 roadmap 3a-3e 一致；"做/不做"边界清晰（npm/user-rule→S4、Task.yaml→S5、检索内置排除）；验收 5 三情形覆盖 epic"真实拦截一次"要求 ✓；两处偏差见问题 3/4。
2. 致命遗漏：无阻断 S4 的硬缺失——vendored 机制（副本+哈希+快照）在位，source=ec746ea 与 A 仓 HEAD 一致，templates 九件/07 卷实体存在，期望边集可机械提取；验收 5 可用本地 bare 仓构造，验收 7 对账可行；版本关联策略按裁决留 S4（roadmap 已记）。
3. 契约自洽：哈希绑定三层与 S2 交付物（source 字段、硬编码期望集）衔接可行 ✓；doctor/worktree 可配置项符合"机制与用户决策分离" ✓；pre-push 语义见问题 1/2/5。

## 发现的问题
1. **pre-push 规则对 Epic topic 与 history 缺失无解，且与 init 的 gitignore 前提可能互斥** — 严重程度：high
   - 影响：epic topic（.stage=EPIC_SPEC_APPROVED）永不产生 QUALITY_GATE→DONE 行；现存 4 个 topic 均无 .stage-history——code+档案同推即恒拒（实证 0dd4f3a：code+s2-core/.stage+epic roadmap 同推）。init 的 {wf} gitignore 条目若含整目录忽略：档案不入 diff → topic 关联恒空，规则 ③ 将拒全部代码 push（B 仓档案现已入 git，忽略后新档案失追踪）。
   - 建议：限定判定范围为 Story/Issue topic（Epic 按 EPIC_SPEC_APPROVED/ALL_DONE 口径）；声明 history 缺失（legacy/迁移期）的判定；对齐"档案入 git"前提与 init ignore 范围。
2. **B 仓自身 hook 安装立场与"代码"口径未声明** — 严重程度：medium
   - 影响：规则 ① 仅豁免 .specpipe/**，README/docs/配置类变更视同"代码"，无 topic 即拒——B 仓若自装 hook，"直接 main 迭代"日常变更全数被挡。
   - 建议：明示 B 仓自身不安装（dogfooding 归 S4 载体）或给 doc/chore 豁免口径；界定"代码"路径范围。
3. **epic Story 3 明列的"fence 脚本模板"缺失且未声明** — 严重程度：medium
   - 影响：epic 范围含"ocp init 铺设 {wf}/ + 模板 + fence 脚本模板 + hook"，spec 规则 7/验收 2 仅三件、未入"不做"——S4 消费者项目 fence 铺设无着落。
   - 建议：补入 3a 交付物，或经用户裁决后明确不做并给替代。
4. **check-tools 五项与 epic/09 清单偏差，两扫描工具边界不清** — 严重程度：medium
   - 影响：epic 与 09-check-split 机械项含 whitespace，spec 改 banned-words 未声明取舍；banned-words/platform-words 均"词表 configs/ 可配置"、扫描目标未区分，impl 易重复/混淆。
   - 建议：明确 whitespace 处置（补入/lint 承担/裁决）；写明两工具扫描对象与词表来源差异。
5. **vendor-sync 后"07 已换、边集未适配"无机械信号** — 严重程度：low
   - 影响与建议：同步自更新哈希后哈希锁与快照对账均绿、语义可能仍旧（盲区）；建议 snapshot 记来源 commit，doctor 展示"上次语义适配来源"并比对报警。

## 结论
# REJECT
状态：SPEC_REVIEWING → SPEC_DRAFT