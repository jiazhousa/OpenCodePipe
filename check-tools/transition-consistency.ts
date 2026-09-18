// 转移表三层一致性检查核心（D13）——纯逻辑模块，可独立 import 测试；
// CLI 消费（ocp check transition-consistency，块C 路由）与 scripts/vendor-sync.ts 的哈希未变对账复用本模块。
// 三层：① vendored 哈希（vendor.files 十件全量逐一重算）② 数据文件 schema 自校验 ③ 快照对账（D7 比较键双向）。
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** vendored 文件清单（相对 configs/vendor/specpipe/）：07 卷 + templates 九件共十件——vendor 段声明与 vendor-sync 复制源的单一事实源 */
export const VENDOR_FILE_PATHS: readonly string[] = [
  "07-state-machine.md",
  "templates/epic-spec-template.md",
  "templates/impl-template.md",
  "templates/issue-impl-template.md",
  "templates/review-epic-spec-template.md",
  "templates/review-impl-template.md",
  "templates/review-issue-impl-template.md",
  "templates/review-quality-gate-template.md",
  "templates/review-spec-template.md",
  "templates/spec-template.md",
];

/** vendor 段内 07 卷的声明键——vendor-sync 契约变化判据比对对象 */
export const VENDOR_KEY_07 = "07-state-machine.md";

/** B 仓 configs/ 默认路径（本模块位于 check-tools/ 下，距仓库根一级） */
export const defaultConfigsDir = fileURLToPath(new URL("../configs/", import.meta.url));

/** 单文件 sha256（十六进制小写） */
export function sha256File(absPath: string): string {
  return createHash("sha256").update(readFileSync(absPath)).digest("hex");
}

/** 状态定义（数据文件/快照 states 段单条；布尔 flags 缺省视为 false，比较时归一化） */
interface StateDef {
  name: string;
  path: string;
  initial?: boolean;
  blocking?: boolean;
  terminal?: boolean;
  shared?: boolean;
}

/** 转移边定义（from=null 为建档边） */
interface EdgeDef {
  from: string | null;
  to: string;
  actor: string;
  trigger: string;
}

/** vendor 段声明（D6：repo / commit / files 十件全量哈希） */
interface VendorDecl {
  repo?: string;
  commit?: string;
  files?: Record<string, string>;
}

/** 数据文件顶层（仅列本模块消费的字段） */
export interface TableFile {
  version?: number;
  source?: string;
  states?: StateDef[];
  transitions?: EdgeDef[];
  vendor?: VendorDecl;
}

/** 快照文件顶层（D7：与 tests/table.test.ts 硬编码常量同构） */
interface SnapshotFile {
  states?: StateDef[];
  transitions?: EdgeDef[];
}

export interface ConsistencyItem {
  name: string;
  pass: boolean;
  problems: string[];
}

export interface ConsistencyResult {
  pass: boolean;
  items: ConsistencyItem[];
}

/** 边唯一键（D7 比较键：from→to|trigger|actor，同目标双边靠 trigger 区分；建档边 from 记 ∅） */
const edgeKey = (edge: EdgeDef): string => `${edge.from ?? "∅"}→${edge.to}|${edge.trigger}|${edge.actor}`;

/** ① vendored 哈希：遍历 vendor.files 全量逐件重算 sha256 比对（07 与 templates 九件都查）；另校验声明键集与十件清单恰一致，防残缺声明自洽通过。导出供 doctor checkVendored 复用（L5 重构：单一实现两处消费） */
export function checkVendorHashes(configsDir: string, table: TableFile): ConsistencyItem {
  const name = "① vendored 哈希（vendor.files 十件全量逐一重算）";
  const problems: string[] = [];
  const vendor = table.vendor;
  if (!vendor || typeof vendor !== "object" || !vendor.files || typeof vendor.files !== "object") {
    return { name, pass: false, problems: ["vendor 段缺失或形态非法（应由 scripts/vendor-sync.ts 建立并维护）"] };
  }
  const expected = new Set(VENDOR_FILE_PATHS);
  for (const rel of Object.keys(vendor.files)) {
    if (!expected.has(rel)) problems.push(`${rel}：不在十件清单内（多余声明）`);
  }
  for (const rel of VENDOR_FILE_PATHS) {
    const declared = vendor.files[rel];
    if (typeof declared !== "string") {
      problems.push(`${rel}：声明缺失（07 与 templates 九件须全量录哈希）`);
      continue;
    }
    const abs = join(configsDir, "vendor", "specpipe", rel);
    if (!existsSync(abs)) {
      problems.push(`${rel}：vendored 文件缺失`);
      continue;
    }
    const actual = sha256File(abs);
    if (actual !== declared) problems.push(`${rel}：哈希不符（声明 ${declared.slice(0, 12)}… 实际 ${actual.slice(0, 12)}…）`);
  }
  return { name, pass: problems.length === 0, problems };
}

/** ② 数据文件 schema 自校验：状态引用完整性 / initial 与 terminal 存在 / 边引用状态存在 / 建档与终态不变式 / 边键唯一 */
function checkSchema(table: TableFile): ConsistencyItem {
  const name = "② 数据文件 schema（引用完整性 / initial / terminal / 建档与终态不变式 / 边键唯一）";
  const problems: string[] = [];
  const states = Array.isArray(table.states) ? table.states : [];
  const transitions = Array.isArray(table.transitions) ? table.transitions : [];
  if (states.length === 0) problems.push("states 为空或非数组");
  if (transitions.length === 0) problems.push("transitions 为空或非数组");
  const names = new Set<string>();
  for (const state of states) {
    if (names.has(state.name)) problems.push(`状态重名：${state.name}`);
    names.add(state.name);
    if (state.path !== "epic" && state.path !== "story" && state.path !== "issue") {
      problems.push(`${state.name}：path 非法（${String(state.path)}）`);
    }
  }
  // initial 存在：三条路径各至少一个起始态（建档边的合法目标）
  for (const path of ["epic", "story", "issue"] as const) {
    if (!states.some((state) => state.path === path && state.initial === true)) problems.push(`${path} 路径缺少 initial 状态`);
  }
  // terminal 存在：终态无后继（DONE / ALL_DONE）
  if (!states.some((state) => state.terminal === true)) problems.push("缺少 terminal 状态");
  // 边引用状态存在 + 建档边目标 ⟺ initial + 边键唯一
  const seenKeys = new Set<string>();
  for (const [index, edge] of transitions.entries()) {
    if (edge.from !== null && !names.has(edge.from)) problems.push(`transitions[${index}]：from 引用未知状态 ${String(edge.from)}`);
    if (!names.has(edge.to)) problems.push(`transitions[${index}]：to 引用未知状态 ${String(edge.to)}`);
    if (edge.from === null) {
      const target = states.find((state) => state.name === edge.to);
      if (target && target.initial !== true) problems.push(`建档边目标 ${edge.to} 不是 initial 状态`);
    }
    const key = edgeKey(edge);
    if (seenKeys.has(key)) problems.push(`transitions[${index}]：边键重复（${key}）`);
    seenKeys.add(key);
  }
  for (const state of states) {
    if (state.initial === true && !transitions.some((edge) => edge.from === null && edge.to === state.name)) {
      problems.push(`initial 状态 ${state.name} 无建档边`);
    }
    if (state.terminal === true && transitions.some((edge) => edge.from === state.name)) {
      problems.push(`terminal 状态 ${state.name} 存在出边`);
    }
  }
  return { name, pass: problems.length === 0, problems };
}

/** 状态 flags 归一化比较字段（缺省布尔视为 false；path 为字符串原值） */
const STATE_COMPARE_FIELDS = ["path", "initial", "blocking", "terminal", "shared"] as const;

/** ③ 快照对账：snapshot ↔ 数据文件按 D7 比较键双向——state=name（flags 全等）、edge=from→to|trigger|actor */
function checkSnapshot(configsDir: string, table: TableFile): ConsistencyItem {
  const name = "③ 快照对账（snapshot ↔ 数据文件，D7 比较键双向）";
  const problems: string[] = [];
  const snapshotPath = join(configsDir, "transition-snapshot.json");
  let snapshot: SnapshotFile;
  try {
    snapshot = JSON.parse(readFileSync(snapshotPath, "utf8")) as SnapshotFile;
  } catch {
    return { name, pass: false, problems: [`快照文件缺失或解析失败：${snapshotPath}`] };
  }
  // 状态双向：state=name 比较键；path 与四个布尔 flags 全等（缺省归一化为 false）
  const tableStates = new Map((table.states ?? []).map((state) => [state.name, state]));
  const snapStates = new Map((snapshot.states ?? []).map((state) => [state.name, state]));
  for (const stateName of snapStates.keys()) {
    if (!tableStates.has(stateName)) problems.push(`快照多出状态：${stateName}`);
  }
  for (const [stateName, state] of tableStates) {
    const snap = snapStates.get(stateName);
    if (!snap) {
      problems.push(`数据文件多出状态（快照缺）：${stateName}`);
      continue;
    }
    for (const field of STATE_COMPARE_FIELDS) {
      const left = field === "path" ? state.path : (state[field] ?? false);
      const right = field === "path" ? snap.path : (snap[field] ?? false);
      if (left !== right) problems.push(`状态 ${stateName} 的 ${field} 不一致（数据文件=${String(left)} 快照=${String(right)}）`);
    }
  }
  // 边双向：from→to|trigger|actor 比较键；两侧各自先查重复键（Set 尺寸 != 数组长度即有重复）
  const tableKeys = (table.transitions ?? []).map(edgeKey);
  const snapKeys = (snapshot.transitions ?? []).map(edgeKey);
  if (new Set(tableKeys).size !== tableKeys.length) problems.push("数据文件边键存在重复");
  if (new Set(snapKeys).size !== snapKeys.length) problems.push("快照边键存在重复");
  const tableSet = new Set(tableKeys);
  const snapSet = new Set(snapKeys);
  for (const key of snapKeys) {
    if (!tableSet.has(key)) problems.push(`快照多出边：${key}`);
  }
  for (const key of tableKeys) {
    if (!snapSet.has(key)) problems.push(`数据文件多出边（快照缺）：${key}`);
  }
  return { name, pass: problems.length === 0, problems };
}

/**
 * 执行三层一致性检查。configsDir 指向包含 transition-table.json / transition-snapshot.json / vendor/ 的目录，
 * 缺省为 B 仓 configs/；测试可注入临时目录副本（篡改场景勿改真实文件）。
 */
export function checkTransitionConsistency(configsDir: string = defaultConfigsDir): ConsistencyResult {
  const tablePath = join(configsDir, "transition-table.json");
  let table: TableFile;
  try {
    table = JSON.parse(readFileSync(tablePath, "utf8")) as TableFile;
  } catch (error) {
    return {
      pass: false,
      items: [{ name: "数据文件读取", pass: false, problems: [`无法读取或解析 ${tablePath}：${error instanceof Error ? error.message : String(error)}`] }],
    };
  }
  const items = [checkVendorHashes(configsDir, table), checkSchema(table), checkSnapshot(configsDir, table)];
  return { pass: items.every((item) => item.pass), items };
}

/** 人读输出：逐项 PASS/FAIL + 问题明细 + 总结行（CLI 路由与 vendor-sync 共用） */
export function formatConsistencyResult(result: ConsistencyResult): string {
  const lines = result.items.map((item) => {
    const head = `${item.pass ? "PASS" : "FAIL"} ${item.name}`;
    return item.problems.length === 0 ? head : `${head}\n  - ${item.problems.join("\n  - ")}`;
  });
  lines.push(result.pass ? "三层一致性检查：PASS" : "三层一致性检查：FAIL");
  return lines.join("\n");
}
