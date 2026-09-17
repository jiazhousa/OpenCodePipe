// hook-core / hook 解析测试（改动点 14）：mock 文件清单 + mkdtemp 临时仓构造工作区
// .stage/.stage-history/epic-spec.md——七类用例：① 纯档案放行 ② 代码+topic DONE 有 history
// （紧凑形态）②b history 空格形态（07 卷示例）③ 非 DONE/缺 .stage 拒 ③b history 存在但无
// QUALITY_GATE→DONE 行拒 ④ Epic topic 跳过 ⑤ 代码无 topic WARN 放行 ⑥ 白名单优先级
// （agents/**.md 算代码）⑦ topic 整目录删除不触发；另含 hook.ts 纯解析函数与配置锚定用例。
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brepoRoot } from "../cli/brepo-root";
import { DEFAULT_PREPUSH_CONFIG, evaluatePush, type DiffFile } from "../cli/commands/hook-core";
import { HookInputError, parseNameStatus, parseRefLines } from "../cli/commands/hook";

let repoRoot: string;
const CONFIG = DEFAULT_PREPUSH_CONFIG;

/** 写 topic 的 .stage（content 为 null 表示不写文件） */
async function writeStage(topic: string, content: string | null): Promise<void> {
  const dir = join(repoRoot, ".specpipe", "plans", topic);
  await mkdir(dir, { recursive: true });
  if (content !== null) {
    await writeFile(join(dir, ".stage"), content);
  }
}

/** 写 topic 的 .stage-history（每行一个字符串，原样落盘） */
async function writeHistory(topic: string, lines: string[]): Promise<void> {
  const dir = join(repoRoot, ".specpipe", "plans", topic);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, ".stage-history"), lines.length > 0 ? `${lines.join("\n")}\n` : "");
}

/** topic 目录放置 epic-spec.md（Epic 判定锚点） */
async function touchEpicSpec(topic: string): Promise<void> {
  const dir = join(repoRoot, ".specpipe", "plans", topic);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "epic-spec.md"), "# epic spec\n");
}

/** 紧凑形态 history 行（S2 插件 JSON.stringify 无空格实证形态） */
function compactLine(from: string, to: string): string {
  return JSON.stringify({
    ts: "2026-09-17T10:00:00+08:00",
    topic: "my-topic",
    from,
    to,
    actor: "调度者",
  });
}

beforeEach(async () => {
  repoRoot = await mkdtemp(join(tmpdir(), "ocp-hookcore-test-"));
});

afterEach(async () => {
  await rm(repoRoot, { recursive: true, force: true });
});

describe("evaluatePush（D5 校验核心）", () => {
  test("① 纯档案放行：.specpipe 档案 + README + docs 均 .md 档案类，不触发校验", async () => {
    const files: DiffFile[] = [
      { path: ".specpipe/plans/some-topic/spec.md", deleted: false },
      { path: ".specpipe/reviews/some-topic-spec-revision-1.md", deleted: false },
      { path: "README.md", deleted: false },
      { path: "docs/guide.md", deleted: false },
    ];
    // 不写任何 .stage——纯档案路径根本不应读取状态文件
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("② 代码+topic DONE 且 history 含 QUALITY_GATE→DONE（紧凑形态）→ 放行", async () => {
    await writeStage("my-topic", "DONE\n");
    await writeHistory("my-topic", [
      compactLine("SPEC_REVIEWING", "SPEC_USER_AUDIT"),
      compactLine("WORKING", "QUALITY_GATE"),
      compactLine("QUALITY_GATE", "DONE"),
    ]);
    const files: DiffFile[] = [
      { path: "src/plugin/foo.ts", deleted: false },
      { path: "tests/foo.test.ts", deleted: false },
      { path: ".specpipe/plans/my-topic/spec.md", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("②b history 空格形态（07 卷 JSONL 示例，键序不同）→ 同样放行", async () => {
    await writeStage("bd-score-panel", "DONE\n");
    // 空格形态 + 键序与插件输出不同（to/from 互换位置）——JSON.parse 天然容错
    await writeHistory("bd-score-panel", [
      '{"actor": "审查者", "ts": "2026-09-16T21:00:00+08:00", "topic": "bd-score-panel", "to": "DONE", "from": "QUALITY_GATE"}',
    ]);
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/bd-score-panel/impl.md", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("③ 代码+topic 非 DONE → 拒（含 topic、当前状态与 --no-verify 指引）", async () => {
    await writeStage("my-topic", "WORKING\n");
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/my-topic/spec.md", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("reject");
    expect(result.reasons.length).toBe(1);
    expect(result.reasons[0]).toContain("my-topic");
    expect(result.reasons[0]).toContain("WORKING");
    expect(result.reasons[0]).toContain("--no-verify");
  });

  test("③b .stage=DONE 但 history 无 QUALITY_GATE→DONE 行 → 拒（状态与留痕矛盾）", async () => {
    await writeStage("my-topic", "DONE\n");
    await writeHistory("my-topic", [
      compactLine("SPEC_REVIEWING", "SPEC_USER_AUDIT"),
      compactLine("WORKING", "QUALITY_GATE"),
    ]);
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/my-topic/.stage", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("reject");
    expect(result.reasons[0]).toContain("矛盾");
    expect(result.reasons[0]).toContain("QUALITY_GATE");
  });

  test("③c .stage=DONE 而 history 文件不存在 → 放行 + WARN（存量豁免）", async () => {
    await writeStage("my-topic", "DONE\n");
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/my-topic/spec.md", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.reasons).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("my-topic");
    expect(result.warnings[0]).toContain("存量豁免");
  });

  test("③d .stage 文件不存在 → 拒（视为未完成）", async () => {
    // 只建目录不写 .stage（topic 目录存在但未建档）
    await writeStage("half-topic", null);
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/half-topic/spec.md", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("reject");
    expect(result.reasons[0]).toContain("缺失");
  });

  test("④ Epic topic（目录含 epic-spec.md）→ 跳过校验（.stage 非 DONE 也不拒）", async () => {
    await touchEpicSpec("crm-epic");
    await writeStage("crm-epic", "EPIC_SPEC_APPROVED\n");
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/crm-epic/epic-spec.md", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.reasons).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  test("⑤ 代码无 topic → WARN 放行", async () => {
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: "package.json", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.reasons).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("topic");
  });

  test("⑥ 白名单优先级：agents/**.md 与 configs/vendor/**.md 命中即代码（触发校验拒）；docs/**.md 为档案（不触发）", async () => {
    await writeStage("t-agent", "WORKING\n");
    await writeStage("t-vendor", "WORKING\n");
    // agents/** 下的 .md 算代码 → 触发校验 → 拒
    const agentFiles: DiffFile[] = [
      { path: "agents/oracle.md", deleted: false },
      { path: ".specpipe/plans/t-agent/spec.md", deleted: false },
    ];
    expect((await evaluatePush(agentFiles, repoRoot, CONFIG)).decision).toBe("reject");
    // configs/vendor/** 下的 .md 算代码（契约文件是行为载体）→ 拒
    const vendorFiles: DiffFile[] = [
      { path: "configs/vendor/specpipe/07-state-machine.md", deleted: false },
      { path: ".specpipe/plans/t-vendor/spec.md", deleted: false },
    ];
    expect((await evaluatePush(vendorFiles, repoRoot, CONFIG)).decision).toBe("reject");
    // 反向对照：docs/** 下的 .md 未命中白名单 → 档案类，不触发校验
    const docsFiles: DiffFile[] = [
      { path: "docs/roadmap.md", deleted: false },
      { path: ".specpipe/plans/t-agent/spec.md", deleted: false },
    ];
    const result = await evaluatePush(docsFiles, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.warnings).toEqual([]);
  });

  test("⑦ topic 整目录删除不触发校验：全删 topic 豁免后无存活 topic → 代码无 topic WARN 放行", async () => {
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/old-topic/spec.md", deleted: true },
      { path: ".specpipe/plans/old-topic/.stage", deleted: true },
      { path: ".specpipe/plans/old-topic/.stage-history", deleted: true },
    ];
    // 不写 old-topic 任何文件——豁免路径根本不应读取
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.reasons).toEqual([]);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain("topic");
  });

  test("⑦b 混合：整目录删除的 topic 豁免 + 存活 topic 正常校验（互不影响）", async () => {
    await writeStage("alive-topic", "DONE\n");
    await writeHistory("alive-topic", [compactLine("QUALITY_GATE", "DONE")]);
    const files: DiffFile[] = [
      { path: "src/a.ts", deleted: false },
      { path: ".specpipe/plans/old-topic/spec.md", deleted: true },
      { path: ".specpipe/plans/alive-topic/spec.md", deleted: false },
    ];
    const result = await evaluatePush(files, repoRoot, CONFIG);
    expect(result.decision).toBe("allow");
    expect(result.warnings).toEqual([]);
    // 存活 topic 若未完成仍要拒——豁免只针对全删 topic
    await writeStage("alive-topic", "WORKING\n");
    const rejected = await evaluatePush(files, repoRoot, CONFIG);
    expect(rejected.decision).toBe("reject");
  });
});

describe("stdin ref 解析（parseRefLines，D3）", () => {
  test("两行 ref 正常解析，空行容忍", () => {
    const input = [
      "refs/heads/dev/feat/x 4b825dc672cb6eb8a060e54bf8d69288fbee4904 refs/heads/dev/feat/x 0000000000000000000000000000000000000000",
      "",
      "refs/tags/v1 1111111111111111111111111111111111111111 refs/tags/v1 2222222222222222222222222222222222222222",
    ].join("\n");
    const refs = parseRefLines(input);
    expect(refs.length).toBe(2);
    expect(refs[0]).toEqual({
      localRef: "refs/heads/dev/feat/x",
      localSha: "4b825dc672cb6eb8a060e54bf8d69288fbee4904",
      remoteRef: "refs/heads/dev/feat/x",
      remoteSha: "0000000000000000000000000000000000000000",
    });
    expect(refs[1].localRef).toBe("refs/tags/v1");
  });

  test("畸形行（段数不足/超量）抛 HookInputError；空 stdin 返回空数组", () => {
    expect(() => parseRefLines("only one token")).toThrow(HookInputError);
    expect(() => parseRefLines("a b c d e")).toThrow(HookInputError);
    expect(parseRefLines("")).toEqual([]); // 空 stdin = 无 ref
  });
});

describe("name-status 解析（parseNameStatus）", () => {
  test("M/A/D 单列 + R/C 双列展开", () => {
    const output = [
      "M\tsrc/a.ts",
      "A\tcli/commands/new.ts",
      "D\ttests/old.test.ts",
      "R100\tcli/old-name.ts\tcli/new-name.ts",
      "C100\tconfigs/base.json\tconfigs/copy.json",
      "", // 尾空行容忍
    ].join("\n");
    const files = parseNameStatus(output);
    expect(files).toEqual([
      { path: "src/a.ts", deleted: false },
      { path: "cli/commands/new.ts", deleted: false },
      { path: "tests/old.test.ts", deleted: true },
      // rename：旧路径记删除、新路径记存活——两侧分别参与档案/代码分类与删除豁免判定
      { path: "cli/old-name.ts", deleted: true },
      { path: "cli/new-name.ts", deleted: false },
      { path: "configs/base.json", deleted: false },
      { path: "configs/copy.json", deleted: false },
    ]);
  });
});

describe("配置锚定（D4）", () => {
  test("configs/prepush-config.json 与 DEFAULT_PREPUSH_CONFIG 同值（默认值唯一事实源，防漂移）", async () => {
    const raw = JSON.parse(
      await readFile(join(brepoRoot(), "configs", "prepush-config.json"), "utf8"),
    ) as typeof DEFAULT_PREPUSH_CONFIG;
    expect(raw).toEqual(DEFAULT_PREPUSH_CONFIG);
  });
});
