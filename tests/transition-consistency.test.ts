// 块D 三层一致性 + vendor-sync 判据测试（D7/D8/D13）。
// 篡改场景一律在 mkdtemp 沙箱副本上操作（复制真实 configs/），不触碰真实文件；
// vendor-sync 判据经核心函数 runVendorSync 注入伪 A 仓与假 commit 验证（--tag clone 网络路径不测）。
import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { checkTransitionConsistency, VENDOR_FILE_PATHS } from "../check-tools/transition-consistency";
import { runVendorSync } from "../scripts/vendor-sync";

const repoConfigs = fileURLToPath(new URL("../configs/", import.meta.url));
const vendoredSpecpipe = join(repoConfigs, "vendor", "specpipe");

/** 沙箱：复制真实 configs/（表 + 快照 + vendored 十件）到临时目录，返回沙箱根 */
async function makeSandbox(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ocp-consist-"));
  await cp(repoConfigs, join(root, "configs"), { recursive: true });
  return root;
}

/** 伪 A 仓：复制真实 vendored 副本拼出 A 仓形态（根下 07 + templates/ 九件），十件哈希与 vendor 声明天然一致 */
async function makeFakeARepo(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ocp-fakea-"));
  await cp(vendoredSpecpipe, dir, { recursive: true });
  return dir;
}

const sha256Of = async (path: string): Promise<string> => createHash("sha256").update(await readFile(path)).digest("hex");

describe("三层一致性（D13）", () => {
  test("① 正常基线：真实仓库三层全 PASS", () => {
    const result = checkTransitionConsistency(repoConfigs);
    expect(result.items.map((item) => item.name)).toEqual([
      "① vendored 哈希（vendor.files 十件全量逐一重算）",
      "② 数据文件 schema（引用完整性 / initial / terminal / 建档与终态不变式 / 边键唯一）",
      "③ 快照对账（snapshot ↔ 数据文件，D7 比较键双向）",
    ]);
    expect(result.pass).toBe(true);
    for (const item of result.items) {
      expect(item.problems).toEqual([]);
    }
  });

  test("② 篡改 vendored templates 任一文件 → ①层哈希 FAIL，②③层不受影响", async () => {
    const root = await makeSandbox();
    try {
      const target = join(root, "configs", "vendor", "specpipe", "templates", "spec-template.md");
      await writeFile(target, `${await readFile(target, "utf8")}\n<!-- 篡改字节 -->\n`);
      const result = checkTransitionConsistency(join(root, "configs"));
      expect(result.pass).toBe(false);
      const [hashItem, schemaItem, snapshotItem] = result.items;
      expect(hashItem!.pass).toBe(false);
      expect(hashItem!.problems.join("\n")).toContain("templates/spec-template.md：哈希不符");
      expect(schemaItem!.pass).toBe(true);
      expect(snapshotItem!.pass).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("②b 篡改 vendored 07 卷 → ①层哈希 FAIL", async () => {
    const root = await makeSandbox();
    try {
      const target = join(root, "configs", "vendor", "specpipe", "07-state-machine.md");
      await writeFile(target, `${await readFile(target, "utf8")}\n<!-- 篡改字节 -->\n`);
      const result = checkTransitionConsistency(join(root, "configs"));
      expect(result.pass).toBe(false);
      expect(result.items[0]!.pass).toBe(false);
      expect(result.items[0]!.problems.join("\n")).toContain("07-state-machine.md：哈希不符");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("②c vendored 文件删除 → ①层报文件缺失", async () => {
    const root = await makeSandbox();
    try {
      await rm(join(root, "configs", "vendor", "specpipe", "templates", "impl-template.md"));
      const result = checkTransitionConsistency(join(root, "configs"));
      expect(result.items[0]!.pass).toBe(false);
      expect(result.items[0]!.problems.join("\n")).toContain("templates/impl-template.md：vendored 文件缺失");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("③ 篡改数据文件边（trigger）→ ③层快照对账 FAIL，①②层不受影响", async () => {
    const root = await makeSandbox();
    try {
      const tablePath = join(root, "configs", "transition-table.json");
      const table = JSON.parse(await readFile(tablePath, "utf8")) as { transitions: Array<{ trigger: string }> };
      table.transitions[0]!.trigger = "篡改后的触发器";
      await writeFile(tablePath, `${JSON.stringify(table, null, 2)}\n`);
      const result = checkTransitionConsistency(join(root, "configs"));
      expect(result.pass).toBe(false);
      const [hashItem, schemaItem, snapshotItem] = result.items;
      expect(hashItem!.pass).toBe(true);
      expect(schemaItem!.pass).toBe(true);
      expect(snapshotItem!.pass).toBe(false);
      const text = snapshotItem!.problems.join("\n");
      expect(text).toContain("数据文件多出边（快照缺）：EPIC_SPEC_DRAFT→EPIC_SPEC_REVIEWING|篡改后的触发器|调度者");
      expect(text).toContain("快照多出边：EPIC_SPEC_DRAFT→EPIC_SPEC_REVIEWING|流程推进|调度者");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("③b 篡改数据文件状态 flags → ③层报 flags 不一致", async () => {
    const root = await makeSandbox();
    try {
      const tablePath = join(root, "configs", "transition-table.json");
      const table = JSON.parse(await readFile(tablePath, "utf8")) as { states: Array<{ name: string; blocking?: boolean }> };
      const state = table.states.find((item) => item.name === "SPEC_USER_AUDIT")!;
      state.blocking = false;
      await writeFile(tablePath, `${JSON.stringify(table, null, 2)}\n`);
      const result = checkTransitionConsistency(join(root, "configs"));
      expect(result.items[2]!.pass).toBe(false);
      expect(result.items[2]!.problems.join("\n")).toContain("状态 SPEC_USER_AUDIT 的 blocking 不一致（数据文件=false 快照=true）");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

describe("vendor-sync 判据（D8 钉死）", () => {
  test("④a 首跑（无旧 vendor 声明）→ 视同哈希变化路径但 0 退出 + 首次基线提示；vendor 段十件全量写入", async () => {
    const root = await makeSandbox();
    const fakeA = await makeFakeARepo();
    try {
      // 抹掉旧声明模拟首跑
      const tablePath = join(root, "configs", "transition-table.json");
      const table = JSON.parse(await readFile(tablePath, "utf8")) as { vendor?: unknown; source?: string };
      delete table.vendor;
      await writeFile(tablePath, `${JSON.stringify(table, null, 2)}\n`);
      const commit = "f".repeat(40);
      const result = await runVendorSync({ sourceDir: fakeA, configsDir: join(root, "configs"), commit });
      expect(result.code).toBe(0);
      expect(result.lines.join("\n")).toContain("首次基线");
      // vendor 段写入：repo 常量 + commit + 十件全量哈希；source 同步更新
      const updated = JSON.parse(await readFile(tablePath, "utf8")) as {
        source: string;
        vendor: { repo: string; commit: string; files: Record<string, string> };
      };
      expect(updated.vendor.repo).toBe("https://github.com/jiazhousa/SpecPipe");
      expect(updated.vendor.commit).toBe(commit);
      expect(updated.source).toBe(commit);
      expect(Object.keys(updated.vendor.files).sort()).toEqual([...VENDOR_FILE_PATHS].sort());
      // vendored 07 与源一致（复制真实落地）
      expect(await readFile(join(root, "configs", "vendor", "specpipe", "07-state-machine.md"), "utf8"))
        .toBe(await readFile(join(fakeA, "07-state-machine.md"), "utf8"));
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(fakeA, { recursive: true, force: true });
    }
  });

  test("④b 新 07 哈希 ≠ 旧声明 → 非零退出 + 契约已变提示人工适配；vendor 段已更新至新基线", async () => {
    const root = await makeSandbox();
    const fakeA = await makeFakeARepo();
    try {
      const mutated = join(fakeA, "07-state-machine.md");
      await writeFile(mutated, `${await readFile(mutated, "utf8")}\n> 篡改：新增一行改变哈希\n`);
      const result = await runVendorSync({ sourceDir: fakeA, configsDir: join(root, "configs"), commit: "a".repeat(40) });
      expect(result.code).toBe(1);
      const text = result.lines.join("\n");
      expect(text).toContain("契约已变");
      expect(text).toContain("人工适配");
      // 契约已变路径下 vendored 副本与 vendor 声明已更新至新基线，转移表待人工重推导
      const updated = JSON.parse(await readFile(join(root, "configs", "transition-table.json"), "utf8")) as {
        vendor: { files: Record<string, string> };
      };
      expect(updated.vendor.files["07-state-machine.md"]).toBe(await sha256Of(mutated));
      expect(updated.vendor.files["templates/spec-template.md"]).toBe(await sha256Of(join(fakeA, "templates", "spec-template.md")));
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(fakeA, { recursive: true, force: true });
    }
  });

  test("④c 07 哈希未变 → 跑对账三层 PASS → 0 退出", async () => {
    const root = await makeSandbox();
    const fakeA = await makeFakeARepo();
    try {
      const result = await runVendorSync({ sourceDir: fakeA, configsDir: join(root, "configs"), commit: "b".repeat(40) });
      expect(result.code).toBe(0);
      const text = result.lines.join("\n");
      expect(text).toContain("07 哈希未变");
      expect(text).toContain("三层一致性检查：PASS");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(fakeA, { recursive: true, force: true });
    }
  });

  test("④d 07 哈希未变但快照对账失败 → 非零退出", async () => {
    const root = await makeSandbox();
    const fakeA = await makeFakeARepo();
    try {
      // 沙箱内篡改快照一条边（模拟转移表/快照漂移未被人工同步）
      const snapshotPath = join(root, "configs", "transition-snapshot.json");
      const snapshot = JSON.parse(await readFile(snapshotPath, "utf8")) as { transitions: Array<{ trigger: string }> };
      snapshot.transitions[0]!.trigger = "漂移的触发器";
      await writeFile(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
      const result = await runVendorSync({ sourceDir: fakeA, configsDir: join(root, "configs"), commit: "c".repeat(40) });
      expect(result.code).toBe(1);
      expect(result.lines.join("\n")).toContain("三层一致性检查：FAIL");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(fakeA, { recursive: true, force: true });
    }
  });

  test("④e 源目录缺件 → 非零退出并列出缺失清单（防半量复制产生残缺基线）", async () => {
    const root = await makeSandbox();
    const fakeA = await makeFakeARepo();
    try {
      await rm(join(fakeA, "templates", "spec-template.md"));
      const result = await runVendorSync({ sourceDir: fakeA, configsDir: join(root, "configs"), commit: "d".repeat(40) });
      expect(result.code).toBe(1);
      expect(result.lines.join("\n")).toContain("templates/spec-template.md");
    } finally {
      await rm(root, { recursive: true, force: true });
      await rm(fakeA, { recursive: true, force: true });
    }
  });
});
