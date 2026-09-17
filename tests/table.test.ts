// 转移表数据文件核对测试。
// 期望状态集与期望边集均硬编码自 A 仓 07/03/04/05 卷的人工逐条推导（不从数据文件生成），
// 与 configs/transition-table.json 加载结果双向断言（数据文件 ⊆ 期望集 = 无多边；期望集 ⊆ 数据文件 = 无缺边）
// ——杜绝以数据文件自证。逐条卷内出处见 .specpipe/plans/specpipe-v2-s2-core/equivalence-check.md。
import { describe, expect, test } from "bun:test";
import { getLegalSuccessors, isLegalTransition, transitionTable } from "../src/core/table";

// ---- 期望状态清单：18 唯一名（Epic 5 + Story 10[含共享 3] + Issue 专属 3；按链位计 21）----

interface ExpectedState {
  name: string;
  path: "epic" | "story" | "issue";
  initial?: boolean;
  blocking?: boolean;
  terminal?: boolean;
  shared?: boolean;
}

const EXPECTED_STATES: ExpectedState[] = [
  // Epic 链（04-epic-path.md；07 卷 L22 链图）
  { name: "EPIC_SPEC_DRAFT", path: "epic", initial: true },
  { name: "EPIC_SPEC_REVIEWING", path: "epic" },
  { name: "EPIC_SPEC_USER_AUDIT", path: "epic", blocking: true },
  { name: "EPIC_SPEC_APPROVED", path: "epic" },
  { name: "ALL_DONE", path: "epic", terminal: true },
  // Story 链（03-story-path.md；07 卷 L28 链图；尾三态为 Story/Issue 共享）
  { name: "SPEC_DRAFT", path: "story", initial: true },
  { name: "SPEC_REVIEWING", path: "story" },
  { name: "SPEC_USER_AUDIT", path: "story", blocking: true },
  { name: "SPEC_APPROVED", path: "story" },
  { name: "IMPL_DRAFT", path: "story" },
  { name: "IMPL_REVIEWING", path: "story" },
  { name: "IMPL_APPROVED", path: "story" },
  { name: "WORKING", path: "story", shared: true },
  { name: "QUALITY_GATE", path: "story", shared: true },
  { name: "DONE", path: "story", terminal: true, shared: true },
  // Issue 专属三态（05-issue-path.md；07 卷 L34 链图；尾部 WORKING→QUALITY_GATE→DONE 引用 Story 共享声明）
  { name: "ISSUE_IMPL_DRAFT", path: "issue", initial: true },
  { name: "ISSUE_IMPL_REVIEWING", path: "issue" },
  { name: "ISSUE_IMPL_APPROVED", path: "issue" },
];

// ---- 期望边清单：25 条转移边 + 3 条建档边（OVERTURN 四类与同目标 REJECT 边分列，trigger 区分）----

interface ExpectedEdge {
  from: string | null;
  to: string;
  trigger: string;
  actor: "调度者" | "审查者";
}

const EXPECTED_EDGES: ExpectedEdge[] = [
  // Epic 链 6 边（04 卷 E-S5 各分支 + Epic 终检；07 卷 L45 行）
  { from: "EPIC_SPEC_DRAFT", to: "EPIC_SPEC_REVIEWING", trigger: "流程推进", actor: "调度者" },
  { from: "EPIC_SPEC_REVIEWING", to: "EPIC_SPEC_USER_AUDIT", trigger: "Epic Spec审查PASS", actor: "审查者" },
  { from: "EPIC_SPEC_REVIEWING", to: "EPIC_SPEC_DRAFT", trigger: "Epic Spec审查REJECT", actor: "审查者" },
  { from: "EPIC_SPEC_REVIEWING", to: "EPIC_SPEC_DRAFT", trigger: "REJECT:SPEC_OVERTURN", actor: "审查者" },
  { from: "EPIC_SPEC_USER_AUDIT", to: "EPIC_SPEC_APPROVED", trigger: "用户放行", actor: "调度者" },
  { from: "EPIC_SPEC_APPROVED", to: "ALL_DONE", trigger: "全部Story DONE", actor: "调度者" },
  // Story 链 14 边（03 卷 S-S5/S-S6/S-S8/S-S9/S-S10；07 卷 L46/L47/L49 行；含 Issue 链引用的共享尾 3 边）
  { from: "SPEC_DRAFT", to: "SPEC_REVIEWING", trigger: "流程推进", actor: "调度者" },
  { from: "SPEC_REVIEWING", to: "SPEC_USER_AUDIT", trigger: "Spec审查PASS", actor: "审查者" },
  { from: "SPEC_REVIEWING", to: "SPEC_DRAFT", trigger: "Spec审查REJECT", actor: "审查者" },
  { from: "SPEC_REVIEWING", to: "SPEC_DRAFT", trigger: "REJECT:SPEC_OVERTURN", actor: "审查者" },
  { from: "SPEC_USER_AUDIT", to: "SPEC_APPROVED", trigger: "用户放行", actor: "调度者" },
  { from: "SPEC_APPROVED", to: "IMPL_DRAFT", trigger: "流程推进", actor: "调度者" },
  { from: "IMPL_DRAFT", to: "IMPL_REVIEWING", trigger: "流程推进", actor: "调度者" },
  { from: "IMPL_REVIEWING", to: "IMPL_APPROVED", trigger: "Impl审查PASS", actor: "审查者" },
  { from: "IMPL_REVIEWING", to: "IMPL_DRAFT", trigger: "Impl审查REJECT", actor: "审查者" },
  { from: "IMPL_REVIEWING", to: "SPEC_DRAFT", trigger: "REJECT:SPEC_OVERTURN", actor: "审查者" },
  { from: "IMPL_APPROVED", to: "WORKING", trigger: "流程推进", actor: "调度者" },
  { from: "WORKING", to: "QUALITY_GATE", trigger: "流程推进", actor: "调度者" },
  // 显式裁决：QUALITY_GATE→DONE 的 actor=调度者（07 卷 L39 分工段「终检双 PASS 后 DONE」；L49 转移表仅记 PASS→DONE 方向）
  { from: "QUALITY_GATE", to: "DONE", trigger: "全面审查PASS", actor: "调度者" },
  { from: "QUALITY_GATE", to: "WORKING", trigger: "全面审查REJECT", actor: "审查者" },
  // Issue 专项 5 边（05 卷 I-S5 各分支 + I-S6；07 卷 L48 行；共享尾 3 边不重复声明）
  { from: "ISSUE_IMPL_DRAFT", to: "ISSUE_IMPL_REVIEWING", trigger: "流程推进", actor: "调度者" },
  { from: "ISSUE_IMPL_REVIEWING", to: "ISSUE_IMPL_APPROVED", trigger: "Issue Impl审查PASS", actor: "审查者" },
  { from: "ISSUE_IMPL_REVIEWING", to: "ISSUE_IMPL_DRAFT", trigger: "Issue Impl审查REJECT", actor: "审查者" },
  { from: "ISSUE_IMPL_REVIEWING", to: "ISSUE_IMPL_DRAFT", trigger: "REJECT:SPEC_OVERTURN", actor: "审查者" },
  { from: "ISSUE_IMPL_APPROVED", to: "WORKING", trigger: "流程推进", actor: "调度者" },
  // 建档 3 边（from=null；03 L19 / 04 L15 / 05 L15 的 *.stage → *_DRAFT 置位）
  { from: null, to: "EPIC_SPEC_DRAFT", trigger: "建档", actor: "调度者" },
  { from: null, to: "SPEC_DRAFT", trigger: "建档", actor: "调度者" },
  { from: null, to: "ISSUE_IMPL_DRAFT", trigger: "建档", actor: "调度者" },
];

/** 边的唯一键：from→to + trigger + actor（OVERTURN 边与同目标 REJECT 边靠 trigger 区分） */
const edgeKey = (edge: { from: string | null; to: string; trigger: string; actor: string }): string =>
  `${edge.from ?? "∅"}→${edge.to}|${edge.trigger}|${edge.actor}`;

describe("转移表数据文件 ↔ 卷推导期望集（双向断言，杜绝自证）", () => {
  test("边集双向一致：期望集 ⊆ 数据文件（无缺边）且数据文件 ⊆ 期望集（无多边）", () => {
    expect(transitionTable.transitions).toHaveLength(28);
    expect(EXPECTED_EDGES).toHaveLength(28);
    const expected = new Set(EXPECTED_EDGES.map(edgeKey));
    const actual = new Set(transitionTable.transitions.map(edgeKey));
    // 期望集 ⊆ 数据文件 = 无缺边
    expect([...expected].filter((key) => !actual.has(key))).toEqual([]);
    // 数据文件 ⊆ 期望集 = 无多边
    expect([...actual].filter((key) => !expected.has(key))).toEqual([]);
    expect(actual.size).toBe(28);
  });

  test("状态集双向一致：18 唯一名，path/initial/blocking/terminal/shared 逐态核对", () => {
    expect(transitionTable.states).toHaveLength(18);
    const actualNames = transitionTable.states.map((state) => state.name);
    expect(new Set(actualNames).size).toBe(18);
    expect([...actualNames].sort()).toEqual([...EXPECTED_STATES.map((state) => state.name)].sort());
    const byName = new Map(transitionTable.states.map((state) => [state.name, state]));
    for (const expected of EXPECTED_STATES) {
      const actual = byName.get(expected.name);
      expect(actual).toBeDefined();
      expect({
        path: actual?.path,
        initial: actual?.initial,
        blocking: actual?.blocking,
        terminal: actual?.terminal,
        shared: actual?.shared,
      }).toEqual({
        path: expected.path,
        initial: expected.initial,
        blocking: expected.blocking,
        terminal: expected.terminal,
        shared: expected.shared,
      });
    }
  });

  test("trigger 取值域受限：建档/流程推进/用户放行/全部Story DONE/REJECT:SPEC_OVERTURN/{审查类型}审查(PASS|REJECT)", () => {
    const pattern = /^(建档|流程推进|用户放行|全部Story DONE|REJECT:SPEC_OVERTURN|.+(审查PASS|审查REJECT))$/;
    for (const transition of transitionTable.transitions) {
      expect(pattern.test(transition.trigger)).toBe(true);
    }
  });

  test("数据文件元信息：source 记 A 仓 commit hash，history 段声明 JSONL 字段契约", () => {
    expect(transitionTable.source).toMatch(/^[0-9a-f]{40}$/);
    const fields = (transitionTable.history as { fields?: Record<string, string> }).fields;
    expect(Object.keys(fields ?? {}).sort()).toEqual(["actor", "from", "to", "topic", "ts"]);
  });
});

describe("每条合法边放行（25+3 全量）", () => {
  test("isLegalTransition 对期望集逐边放行", () => {
    for (const edge of EXPECTED_EDGES) {
      expect(isLegalTransition(edge.from, edge.to)).toBe(true);
    }
  });
});

describe("三路径端到端序列（沿链逐态推进）", () => {
  test("Story 链：建档 → SPEC_DRAFT → … → DONE 全程合法", () => {
    const chain = [
      "SPEC_DRAFT", "SPEC_REVIEWING", "SPEC_USER_AUDIT", "SPEC_APPROVED",
      "IMPL_DRAFT", "IMPL_REVIEWING", "IMPL_APPROVED", "WORKING", "QUALITY_GATE", "DONE",
    ];
    expect(isLegalTransition(null, chain[0]!)).toBe(true);
    for (let i = 0; i + 1 < chain.length; i++) {
      expect(isLegalTransition(chain[i], chain[i + 1])).toBe(true);
    }
  });

  test("Epic 链：建档 → EPIC_SPEC_DRAFT → … → ALL_DONE 全程合法", () => {
    const chain = ["EPIC_SPEC_DRAFT", "EPIC_SPEC_REVIEWING", "EPIC_SPEC_USER_AUDIT", "EPIC_SPEC_APPROVED", "ALL_DONE"];
    expect(isLegalTransition(null, chain[0]!)).toBe(true);
    for (let i = 0; i + 1 < chain.length; i++) {
      expect(isLegalTransition(chain[i], chain[i + 1])).toBe(true);
    }
  });

  test("Issue 链：建档 → ISSUE_IMPL_DRAFT → … → WORKING → QUALITY_GATE → DONE 全程合法（引用共享尾）", () => {
    const chain = [
      "ISSUE_IMPL_DRAFT", "ISSUE_IMPL_REVIEWING", "ISSUE_IMPL_APPROVED",
      "WORKING", "QUALITY_GATE", "DONE",
    ];
    expect(isLegalTransition(null, chain[0]!)).toBe(true);
    for (let i = 0; i + 1 < chain.length; i++) {
      expect(isLegalTransition(chain[i], chain[i + 1])).toBe(true);
    }
  });
});

describe("非法转移代表性枚举（05 卷口径 + 07 卷状态规则）", () => {
  test("跳级：SPEC_DRAFT → IMPL_APPROVED 拒绝", () => {
    expect(isLegalTransition("SPEC_DRAFT", "IMPL_APPROVED")).toBe(false);
  });

  test("逆行：WORKING → SPEC_DRAFT 拒绝（质量门 REJECT 只回 WORKING，不越级回 Spec 段）", () => {
    expect(isLegalTransition("WORKING", "SPEC_DRAFT")).toBe(false);
  });

  test("跨路径污染：EPIC_SPEC_DRAFT → SPEC_REVIEWING 拒绝", () => {
    expect(isLegalTransition("EPIC_SPEC_DRAFT", "SPEC_REVIEWING")).toBe(false);
  });

  test("终态无后继：DONE / ALL_DONE 到任意态拒绝", () => {
    for (const to of ["SPEC_DRAFT", "WORKING", "QUALITY_GATE", "DONE", "ALL_DONE", "EPIC_SPEC_DRAFT", "ISSUE_IMPL_DRAFT"]) {
      expect(isLegalTransition("DONE", to)).toBe(false);
      expect(isLegalTransition("ALL_DONE", to)).toBe(false);
    }
    expect(getLegalSuccessors("DONE")).toEqual([]);
    expect(getLegalSuccessors("ALL_DONE")).toEqual([]);
  });

  test("建档（from=null）仅限三个 initial 态", () => {
    expect(getLegalSuccessors(null).sort()).toEqual(["EPIC_SPEC_DRAFT", "ISSUE_IMPL_DRAFT", "SPEC_DRAFT"].sort());
    // initial ⟺ 存在建档边
    for (const state of transitionTable.states) {
      expect(isLegalTransition(null, state.name)).toBe(state.initial === true);
    }
    expect(isLegalTransition(null, "SPEC_REVIEWING")).toBe(false);
    expect(isLegalTransition(null, "WORKING")).toBe(false);
  });

  test("未知状态无后继、不构成合法边", () => {
    expect(getLegalSuccessors("NOT_A_STAGE")).toEqual([]);
    expect(isLegalTransition("NOT_A_STAGE", "SPEC_DRAFT")).toBe(false);
    expect(isLegalTransition("SPEC_DRAFT", "NOT_A_STAGE")).toBe(false);
  });
});

describe("去重语义（同目标多边只列一次）", () => {
  test("Issue REVIEWING 的 REJECT 与 OVERTURN 双边同目标，后继清单只列 ISSUE_IMPL_DRAFT 一次", () => {
    const successors = getLegalSuccessors("ISSUE_IMPL_REVIEWING");
    expect(successors.filter((name) => name === "ISSUE_IMPL_DRAFT")).toHaveLength(1);
    expect(successors).toContain("ISSUE_IMPL_APPROVED");
  });

  test("全表后继清单无重复（去重不变式）", () => {
    for (const state of transitionTable.states) {
      const successors = getLegalSuccessors(state.name);
      expect(new Set(successors).size).toBe(successors.length);
    }
    const archival = getLegalSuccessors(null);
    expect(new Set(archival).size).toBe(archival.length);
  });
});
