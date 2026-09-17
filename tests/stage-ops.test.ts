// stage 工具核心测试——mkdtemp 临时目录注入（directory=临时目录，wfRoot=".specpipe" 走相对解析），
// 不触碰真实 .specpipe/（D11）。直引 src/plugin/stage-ops：入口仅导出插件函数（D1 loader 约束），
// 工具函数不从入口 re-export。
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StageOpError, getStage, setStage } from "../src/plugin/stage-ops";

const WF_ROOT = ".specpipe";

/** history 的 ts 契约：ISO8601 本地时区偏移格式（如 2026-09-16T21:00:00+08:00），不硬编码偏移值防时区环境差异 */
const TS_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

let base: string;

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "ocp-stage-test-"));
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

/** 读 topic 的 .stage-history 全部行并逐行 JSON.parse */
async function readHistory(topic: string): Promise<Array<Record<string, unknown>>> {
  const content = await readFile(join(base, WF_ROOT, "plans", topic, ".stage-history"), "utf8");
  return content.trim().split("\n").map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** 断言路径不存在（ENOENT）——零写入验证 */
async function expectMissing(path: string): Promise<void> {
  try {
    await readFile(path, "utf8");
    throw new Error(`应不存在：${path}`);
  } catch (error) {
    expect((error as NodeJS.ErrnoException).code).toBe("ENOENT");
  }
}

/** 捕获异步操作的 StageOpError（避免 bun:test rejects matcher 兼容面） */
async function captureStageError(action: () => Promise<unknown>): Promise<StageOpError | undefined> {
  try {
    await action();
  } catch (error) {
    return error as StageOpError;
  }
  return undefined;
}

describe("getStage", () => {
  test("无 .stage 文件：报 STAGE_NOT_FOUND", async () => {
    const error = await captureStageError(() => getStage(base, WF_ROOT, "no-such-topic"));
    expect(error).toBeInstanceOf(StageOpError);
    expect(error?.code).toBe("STAGE_NOT_FOUND");
    expect(error?.message).toContain("no-such-topic");
  });
});

describe("setStage 建档与推进", () => {
  test("建档：from=null → SPEC_DRAFT；.stage 单行状态名+换行；history 建档行 from=null", async () => {
    const record = await setStage(base, WF_ROOT, "story-a", "SPEC_DRAFT", "调度者");
    expect(record).toEqual({
      ts: expect.any(String),
      topic: "story-a",
      from: null,
      to: "SPEC_DRAFT",
      actor: "调度者",
    });
    expect(TS_PATTERN.test(record.ts)).toBe(true);
    const stage = await readFile(join(base, WF_ROOT, "plans", "story-a", ".stage"), "utf8");
    expect(stage).toBe("SPEC_DRAFT\n");
    const history = await readHistory("story-a");
    expect(history).toHaveLength(1);
    expect(history[0]).toEqual({
      ts: expect.any(String),
      topic: "story-a",
      from: null,
      to: "SPEC_DRAFT",
      actor: "调度者",
    });
  });

  test("合法推进：SPEC_DRAFT → SPEC_REVIEWING（该边 actor=调度者）；getStage 复验读到新状态", async () => {
    await setStage(base, WF_ROOT, "story-b", "SPEC_DRAFT", "调度者");
    await setStage(base, WF_ROOT, "story-b", "SPEC_REVIEWING", "调度者");
    const info = await getStage(base, WF_ROOT, "story-b");
    expect(info).toEqual({ topic: "story-b", stage: "SPEC_REVIEWING" });
    const history = await readHistory("story-b");
    expect(history).toHaveLength(2);
    expect(history[1]?.from).toBe("SPEC_DRAFT");
    expect(history[1]?.to).toBe("SPEC_REVIEWING");
  });
});

describe("history JSONL 契约（07 卷字段逐项断言）", () => {
  test("建档+推进两行：字段序 ts/topic/from/to/actor、建档行 from=null、ts 均为本地偏移格式", async () => {
    await setStage(base, WF_ROOT, "hist-topic", "SPEC_DRAFT", "调度者");
    await setStage(base, WF_ROOT, "hist-topic", "SPEC_REVIEWING", "调度者");
    const lines = (await readFile(join(base, WF_ROOT, "plans", "hist-topic", ".stage-history"), "utf8"))
      .trim()
      .split("\n");
    expect(lines).toHaveLength(2);
    const first = JSON.parse(lines[0]!) as Record<string, unknown>;
    // 字段插入序即 JSONL 输出序（ts/topic/from/to/actor，07 卷契约）
    expect(Object.keys(first)).toEqual(["ts", "topic", "from", "to", "actor"]);
    expect(TS_PATTERN.test(first.ts as string)).toBe(true);
    expect(first.topic).toBe("hist-topic");
    expect(first.from).toBeNull();
    expect(first.to).toBe("SPEC_DRAFT");
    expect(first.actor).toBe("调度者");
    const second = JSON.parse(lines[1]!) as Record<string, unknown>;
    expect(TS_PATTERN.test(second.ts as string)).toBe(true);
    expect(second.topic).toBe("hist-topic");
    expect(second.from).toBe("SPEC_DRAFT");
    expect(second.to).toBe("SPEC_REVIEWING");
    expect(second.actor).toBe("调度者");
  });
});

describe("setStage 非法转移（原子性：零写入）", () => {
  test("跳级被拒：错误含去重合法后继；.stage 与 .stage-history 逐字节未变更", async () => {
    await setStage(base, WF_ROOT, "story-c", "SPEC_DRAFT", "调度者");
    await setStage(base, WF_ROOT, "story-c", "SPEC_REVIEWING", "调度者");
    const stageBefore = await readFile(join(base, WF_ROOT, "plans", "story-c", ".stage"), "utf8");
    const historyBefore = await readFile(join(base, WF_ROOT, "plans", "story-c", ".stage-history"), "utf8");

    const error = await captureStageError(() =>
      setStage(base, WF_ROOT, "story-c", "IMPL_APPROVED", "审查者"),
    );
    expect(error).toBeInstanceOf(StageOpError);
    expect(error?.code).toBe("TRANSITION_ILLEGAL");
    expect(error?.message).toContain("IMPL_APPROVED");
    // SPEC_REVIEWING 合法后继 = SPEC_USER_AUDIT + SPEC_DRAFT（REJECT 与 OVERTURN 双边同目标去重只列一次）
    expect([...(error?.legalSuccessors ?? [])].sort()).toEqual(["SPEC_DRAFT", "SPEC_USER_AUDIT"]);
    expect(new Set(error?.legalSuccessors ?? []).size).toBe((error?.legalSuccessors ?? []).length);

    const stageAfter = await readFile(join(base, WF_ROOT, "plans", "story-c", ".stage"), "utf8");
    const historyAfter = await readFile(join(base, WF_ROOT, "plans", "story-c", ".stage-history"), "utf8");
    expect(stageAfter).toBe(stageBefore);
    expect(historyAfter).toBe(historyBefore);
  });

  test("建档到非 initial 态被拒：from=null 的后继仅三初始态；.stage 与 .stage-history 均未创建", async () => {
    const error = await captureStageError(() => setStage(base, WF_ROOT, "story-d", "WORKING", "调度者"));
    expect(error).toBeInstanceOf(StageOpError);
    expect(error?.code).toBe("TRANSITION_ILLEGAL");
    expect([...(error?.legalSuccessors ?? [])].sort()).toEqual([
      "EPIC_SPEC_DRAFT",
      "ISSUE_IMPL_DRAFT",
      "SPEC_DRAFT",
    ]);
    await expectMissing(join(base, WF_ROOT, "plans", "story-d", ".stage"));
    await expectMissing(join(base, WF_ROOT, "plans", "story-d", ".stage-history"));
  });
});

describe("topic 输入加固（kebab-case，防路径逃逸）", () => {
  test("../escape、大写、空串：get/set 双拒（TOPIC_INVALID）且零副作用（未创建任何目录）", async () => {
    for (const bad of ["../escape", "MyTopic", ""]) {
      const getError = await captureStageError(() => getStage(base, WF_ROOT, bad));
      expect(getError).toBeInstanceOf(StageOpError);
      expect(getError?.code).toBe("TOPIC_INVALID");

      const setError = await captureStageError(() => setStage(base, WF_ROOT, bad, "SPEC_DRAFT", "调度者"));
      expect(setError).toBeInstanceOf(StageOpError);
      expect(setError?.code).toBe("TOPIC_INVALID");
    }
    // 临时目录下未创建任何 .specpipe 结构（../escape 形态未逃逸、未铺 plans 目录）
    expect(await readdir(base)).toEqual([]);
  });
});
