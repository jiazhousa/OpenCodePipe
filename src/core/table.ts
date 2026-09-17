// 转移表数据文件加载与纯函数校验——A 仓 07-state-machine.md 三路径状态链契约的机读消费层。
// plugin 与 check-tools 共经本模块消费同一份数据文件，禁止任何消费方硬编码转移边。
import table from "../../configs/transition-table.json";

/** 状态定义（数据文件 states 段单条） */
export interface StateDef {
  name: string;
  path: "epic" | "story" | "issue";
  /** 起始态：建档边（from=null）的唯一合法目标 */
  initial?: boolean;
  /** 阻塞态：须用户放行等外部动作后才继续（07 卷「状态规则」） */
  blocking?: boolean;
  /** 终态：无后继转移（DONE / ALL_DONE） */
  terminal?: boolean;
  /** Story 与 Issue 链共享态（WORKING/QUALITY_GATE/DONE）：Issue 链引用同名态，边不重复声明 */
  shared?: boolean;
}

/** 转移边定义（数据文件 transitions 段单条） */
export interface TransitionDef {
  /** 建档边为 null（三初始态各一条） */
  from: string | null;
  to: string;
  actor: "调度者" | "审查者";
  trigger: string;
}

/** 数据文件顶层结构 */
export interface TransitionTable {
  version: number;
  /** 推导本表时的 A 仓 commit hash */
  source: string;
  states: StateDef[];
  transitions: TransitionDef[];
  history: Record<string, unknown>;
  notes: Record<string, unknown>;
}

export const transitionTable = table as TransitionTable;

/** 后继索引：from（null=建档）→ 去重目标集 */
const successorIndex = new Map<string | null, Set<string>>();
for (const transition of transitionTable.transitions) {
  let targets = successorIndex.get(transition.from);
  if (!targets) {
    targets = new Set<string>();
    successorIndex.set(transition.from, targets);
  }
  targets.add(transition.to);
}

/** 查询合法后继清单（去重：同目标多边只列一次，如 ISSUE_IMPL_REVIEWING 的 REJECT 与 OVERTURN 双边） */
export function getLegalSuccessors(state: string | null): string[] {
  const targets = successorIndex.get(state);
  return targets ? [...targets] : [];
}

/**
 * 校验单步转移合法性。from=null 表示建档：to 必须为 initial 状态。
 * actor 不参与边校验——07 卷「状态更新职责分工」由调用侧约束（审查者/调度者各自只发起归属自己的边）。
 */
export function isLegalTransition(from: string | null, to: string): boolean {
  return successorIndex.get(from)?.has(to) === true;
}
