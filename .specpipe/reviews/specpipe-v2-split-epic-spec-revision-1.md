# 审查报告: specpipe-v2-split (Revision 1)

## 总体评价

通过（软硬分离定位与行为面冻结原则自洽，四条 Story 覆盖全部交付面，无阻塞放行的架构级硬伤；下列为 Story spec 待收口项）

## 审查范围

- 范围边界：做/不做清单清晰，"行为面冻结 + 不做语义变更"与四条 Story 范围一致，无范围蔓延
- 致命遗漏：Story 1-4 覆盖背景全部交付（A 仓规章+templates / B 仓骨架+plugin+agents+cli+check-tools+hook / user-rule / 集成验收 / 退役）；04 契约含状态清单+转移表+阻塞语义+history 格式，方向正确但枚举偏窄（见问题 5）
- Story 拆分/依赖：S1→S2→S3→S4 单向依赖清晰，粒度 2-5 天适中；并行声明与 Story 4 实跑载体存在待收口项（见问题 1、3）

## 发现的问题

1. 集成验收载体与规模待定 — 严重程度：medium
   - 影响：验收标准 2 的终验内容（"CRM demo Issue 级"仅为候选）在 Epic 放行时不可判定，S4 无法据以启动
   - 建议：保留"单独讨论"为决策点，但明确最晚决策时点与决议落盘位置，S4 启动前回填 Epic 验收标准
2. A 仓平台无关性（业务规则 8）缺验收与机械检查 — 严重程度：medium
   - 影响："A 仓无平台词泄漏"是本次拆分的核心不变量，但验收标准 5 项与 Story 3 check-tools 清单（whitespace/行数/commit/转移表）均不含此项，无校验手段
   - 建议：补一条验收标准 + check-tools 规则（或固化进 Story 1 审查清单），否则"仅保证 A 仓无泄漏"不可证
3. Story 2/3 "文件集不相交"声明不成立 — 严重程度：medium
   - 影响：Story 3 的 cli 需改 package.json（bin/依赖）与 CI/fence 脚本，均属 Story 2 骨架产物，并行会踩文件
   - 建议：改为"骨架冻结后再并行"或显式列出双方独占文件集，交由 Story spec 核对
4. v1 非 02/03/04 内容的落位未声明 — 严重程度：medium
   - 影响：检索工具（tvly/exa/c7）、worktree 环境与 external_directory 权限、中断恢复语义、config 项（wf/模型/provider）、关键规则 15 条、文件产出表、subagent 调用规范均无 A/B 归属；"语义等价"审查仅覆盖 02/03/04，存在内容丢失风险
   - 建议：Story 1 spec 先出"v1 章节 → v2 落位"映射表，逐项销账
5. 04 契约枚举偏窄 — 严重程度：low
   - 影响：未显式点明须含 5 类审查的 PASS/REJECT 转移表、SPEC_OVERTURN 回退边、等级重调整/升级回退、中断恢复语义，依赖"与 v1 语义等价"兜底
   - 建议：Story 1 审查清单显式覆盖上述转移边，勿仅凭"合法转移表"一词

## 结论

# PASS
状态：EPIC_SPEC_REVIEWING → EPIC_SPEC_USER_AUDIT
