# 转移表数据文件 ↔ A 仓规章卷 等价对照清单

> 目的：`configs/transition-table.json`（18 唯一状态 + 25 转移边 + 3 建档边）与 A 仓四卷的逐条人工对照留证基线——验收 5 留证、S3e 转移表一致性工具化的比对底稿（沿用 S1 等价底稿命名先例）。
>
> **推导基准**：A 仓（SpecPipe）commit `ec746eac11c8a1a65d0c1b50a0257a60be4a4d29`（2026-09-17），卷：`07-state-machine.md` / `03-story-path.md` / `04-epic-path.md` / `05-issue-path.md`。出处格式：`卷名 L行号`。
>
> **双重防线**：本清单（人工逐条）+ `tests/table.test.ts` 硬编码期望边集双向断言（自证免疫）。

## 一、状态清单（18 唯一名）

> 计数口径：按链位计 21（Epic 5 + Story 10 + Issue 6[含共享尾 3]）；按唯一名计 18（WORKING/QUALITY_GATE/DONE 三共享态 Story/Issue 各引用一次，单条声明 + `shared: true`）。

| # | 状态名 | path | 标记 | 卷内出处 |
|---|---|---|---|---|
| 1 | EPIC_SPEC_DRAFT | epic | initial | 04 L15（E-S3 置位）；07 L22 链图 |
| 2 | EPIC_SPEC_REVIEWING | epic | — | 04 L27（E-S5 置位）；07 L22 |
| 3 | EPIC_SPEC_USER_AUDIT | epic | blocking | 04 L31（PASS 后阻塞）；07 L22 + L58（E-S5 通过后阻塞） |
| 4 | EPIC_SPEC_APPROVED | epic | — | 04 L34（用户放行置位）；07 L22 |
| 5 | ALL_DONE | epic | terminal | 04 L46-52（Epic 终检校验后置位）；07 L78（恢复分类「流程已完成」） |
| 6 | SPEC_DRAFT | story | initial | 03 L19（S-S3 置位）；07 L28 |
| 7 | SPEC_REVIEWING | story | — | 03 L29（S-S5 置位）；07 L28 |
| 8 | SPEC_USER_AUDIT | story | blocking | 03 L35（PASS 后阻塞）；07 L28 + L57 |
| 9 | SPEC_APPROVED | story | — | 03 L35（放行后置位）；07 L28 |
| 10 | IMPL_DRAFT | story | — | 03 L42（S-S6 置位）；07 L28 |
| 11 | IMPL_REVIEWING | story | — | 03 L52（S-S8 置位）；07 L28 |
| 12 | IMPL_APPROVED | story | — | 03 L58（PASS 置位）；07 L28 |
| 13 | WORKING | story | **shared** | 03 L66（S-S9 置位）；05 L42（I-S6 置位）；07 L28 + L34 两链同名同义 |
| 14 | QUALITY_GATE | story | **shared** | 03 L75（S-S9 步骤 7 置位）；05 L46；07 L28 + L34 |
| 15 | DONE | story | terminal, **shared** | 03 L75/L84；05 L46/L50；07 L28 + L34 |
| 16 | ISSUE_IMPL_DRAFT | issue | initial | 05 L15（I-S3 置位）；07 L34 链图 |
| 17 | ISSUE_IMPL_REVIEWING | issue | — | 05 L29（I-S5 置位）；07 L34 |
| 18 | ISSUE_IMPL_APPROVED | issue | — | 05 L33（PASS 置位）；07 L34 |

## 二、转移边清单（25 + 3 建档 = 28）

> actor 指派总则（07 L39 分工段）：流程推进/建档/用户放行后落定/终检汇合 → 调度者；审查 PASS/REJECT/OVERTURN → 审查者。
> OVERTURN 口径（impl D5 定稿）：四类审查的 `REJECT:SPEC_OVERTURN` 全部独立成行，与同目标 REJECT 边分列，靠 trigger 区分。

### Epic 链（6 边）

| # | from | to | actor | trigger | 卷内出处 |
|---|---|---|---|---|---|
| 1 | EPIC_SPEC_DRAFT | EPIC_SPEC_REVIEWING | 调度者 | 流程推进 | 04 L27「调度者将 .stage → EPIC_SPEC_REVIEWING」；07 L39 |
| 2 | EPIC_SPEC_REVIEWING | EPIC_SPEC_USER_AUDIT | 审查者 | Epic Spec审查PASS | 04 L31；07 L45（转移表 Epic Spec 行 PASS →） |
| 3 | EPIC_SPEC_REVIEWING | EPIC_SPEC_DRAFT | 审查者 | Epic Spec审查REJECT | 04 L32；07 L45（REJECT →） |
| 4 | EPIC_SPEC_REVIEWING | EPIC_SPEC_DRAFT | 审查者 | REJECT:SPEC_OVERTURN | 04 L33（OVERTURN 确认后回退） |
| 5 | EPIC_SPEC_USER_AUDIT | EPIC_SPEC_APPROVED | 调度者 | 用户放行 | 04 L34；07 L39「用户放行后 SPEC_APPROVED/EPIC_SPEC_APPROVED」 |
| 6 | EPIC_SPEC_APPROVED | ALL_DONE | 调度者 | 全部Story DONE | 04 L46-52（Epic 终检三校验通过后调度者置 ALL_DONE）；07 L39 |

### Story 链（14 边，含 Issue 链引用的共享尾 3 边）

| # | from | to | actor | trigger | 卷内出处 |
|---|---|---|---|---|---|
| 7 | SPEC_DRAFT | SPEC_REVIEWING | 调度者 | 流程推进 | 03 L29；07 L39 |
| 8 | SPEC_REVIEWING | SPEC_USER_AUDIT | 审查者 | Spec审查PASS | 03 L35；07 L46 |
| 9 | SPEC_REVIEWING | SPEC_DRAFT | 审查者 | Spec审查REJECT | 03 L36；07 L46 |
| 10 | SPEC_REVIEWING | SPEC_DRAFT | 审查者 | REJECT:SPEC_OVERTURN | 03 L37 |
| 11 | SPEC_USER_AUDIT | SPEC_APPROVED | 调度者 | 用户放行 | 03 L35「放行后 .stage → SPEC_APPROVED」；07 L39 |
| 12 | SPEC_APPROVED | IMPL_DRAFT | 调度者 | 流程推进 | 03 L42「.stage → IMPL_DRAFT」；07 L39 |
| 13 | IMPL_DRAFT | IMPL_REVIEWING | 调度者 | 流程推进 | 03 L52；07 L39 |
| 14 | IMPL_REVIEWING | IMPL_APPROVED | 审查者 | Impl审查PASS | 03 L58；07 L47 |
| 15 | IMPL_REVIEWING | IMPL_DRAFT | 审查者 | Impl审查REJECT | 03 L59；07 L47 |
| 16 | IMPL_REVIEWING | SPEC_DRAFT | 审查者 | REJECT:SPEC_OVERTURN | 03 L60；07 L56「Impl 审查推翻 spec → 回退 SPEC_DRAFT」 |
| 17 | IMPL_APPROVED | WORKING | 调度者 | 流程推进 | 03 L66「调度者置 .stage → WORKING」；07 L39 |
| 18 | WORKING | QUALITY_GATE | 调度者 | 流程推进 | 03 L75；05 L46（Issue 链同型）；07 L39「QUALITY_GATE 标记」 |
| 19 | QUALITY_GATE | DONE | **调度者** | 全面审查PASS | 07 L49（转移表方向 PASS→DONE）+ **L39 分工段「终检双 PASS 后 DONE」归调度者——actor 裁决以分工段为准（impl D5 显式裁决；07 L49 转移表本身未标 actor）**；03 L75/L84（汇合点双 PASS → DONE） |
| 20 | QUALITY_GATE | WORKING | 审查者 | 全面审查REJECT | 03 L84「REJECT → .stage → WORKING」；07 L49 |

### Issue 专项（5 边；共享尾 3 边已含于 Story 14 边，不重复声明）

| # | from | to | actor | trigger | 卷内出处 |
|---|---|---|---|---|---|
| 21 | ISSUE_IMPL_DRAFT | ISSUE_IMPL_REVIEWING | 调度者 | 流程推进 | 05 L29；07 L39 |
| 22 | ISSUE_IMPL_REVIEWING | ISSUE_IMPL_APPROVED | 审查者 | Issue Impl审查PASS | 05 L33；07 L48 |
| 23 | ISSUE_IMPL_REVIEWING | ISSUE_IMPL_DRAFT | 审查者 | Issue Impl审查REJECT | 05 L34；07 L48 |
| 24 | ISSUE_IMPL_REVIEWING | ISSUE_IMPL_DRAFT | 审查者 | REJECT:SPEC_OVERTURN | 05 L35；07 L56（「/ ISSUE_IMPL_DRAFT」） |
| 25 | ISSUE_IMPL_APPROVED | WORKING | 调度者 | 流程推进 | 05 L42「调度者置 .stage → WORKING」；07 L39 |

### 建档边（3 边，from=null，actor=调度者，trigger=建档）

| # | from | to | 卷内出处 |
|---|---|---|---|
| 26 | null | EPIC_SPEC_DRAFT | 04 L15（E-S3：写入 epic-spec.md 后 .stage → EPIC_SPEC_DRAFT） |
| 27 | null | SPEC_DRAFT | 03 L19（S-S3：写入 spec.md 后 .stage → SPEC_DRAFT） |
| 28 | null | ISSUE_IMPL_DRAFT | 05 L15（I-S3：写入 issue-impl.md 后 .stage → ISSUE_IMPL_DRAFT） |

## 三、不进表的三类语义（数据文件 notes 段声明）

| 语义 | 表外表达 | 卷内出处 |
|---|---|---|
| 阻塞语义 | `state.blocking` 属性（SPEC_USER_AUDIT / EPIC_SPEC_USER_AUDIT） | 07 L57-58；03 L35；04 L31 |
| S2 重分级与中断恢复 | 调度者行为规则，非转移边 | 07 L63-64（S2 重调整）、L66-81（中断恢复七类） |
| Issue 升级清理 | 删除 `.stage` 文件（非转移边） | 05 L52-56（升级机制步骤 1「清理当前 .stage」） |
| （附）共享态 | `state.shared` 属性，Issue 链引用同名态边不重复 | 07 L28/L34 两链同名同义 |

## 四、对照结论

- 18 唯一状态：**逐条对上，无多无缺**（Story 10 = 7 专属 + 3 共享；Issue 链尾 3 态引用共享声明）。
- 28 边：**逐条对上，无多无缺**（Epic 6 + Story 14 + Issue 5 + 建档 3；四类 OVERTURN 边均独立成行）。
- 唯一需要裁决处：边 19 的 actor——07 卷 L49 转移表与 L39 分工段双源，按 impl D5 裁决取分工段（调度者终检汇合）。
