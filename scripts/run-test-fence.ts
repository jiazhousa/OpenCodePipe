// 测试围栏（fence）——三步串行：typecheck → test → smoke（smoke 引用 src/plugin/index.ts，随块2 交付；
// 在此之前 fence 跑到 smoke 步失败属预期）。
// 范式参照 OpenCodeQuota scripts/run-test-fence.ts 大幅简化：步骤编排 + test-fence-reports/fence-*/summary.txt + SIGINT 中止。
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const reports = join(repository, "test-fence-reports");

interface Step {
  name: string;
  command: string[];
  timeout: number;
}

const steps: Step[] = [
  { name: "typecheck", command: [process.execPath, "run", "typecheck"], timeout: 300_000 },
  { name: "test", command: [process.execPath, "test"], timeout: 600_000 },
  { name: "smoke", command: [process.execPath, join(repository, "scripts/smoke-plugin.ts")], timeout: 300_000 },
];

interface StepResult {
  name: string;
  status: "NOT_RUN" | "RUNNING" | "PASS" | "FAIL";
  exitCode: string;
  reason: string;
  durationMs: number;
}

const results: StepResult[] = steps.map((step) => ({
  name: step.name,
  status: "NOT_RUN",
  exitCode: "未产生",
  reason: "等待前置步骤",
  durationMs: 0,
}));

const logs = new Set<string>();
let directory = "";
let failed = false;
let interrupted = false;
let running: ReturnType<typeof Bun.spawn> | undefined;

// SIGINT/SIGTERM：中止当前子进程，剩余步骤记「收到中止信号」后照常落 summary
const interrupt = () => {
  interrupted = true;
  running?.kill("SIGTERM");
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", interrupt);

async function summary(status: "RUNNING" | "PASS" | "FAIL"): Promise<void> {
  const text = [
    `${status}：OpenCodePipe fence`,
    `本轮目录：${directory}`,
    `时间：${new Date().toISOString()}`,
    ...results.map((item) => `${item.name}：${item.status}；exit=${item.exitCode}；${item.durationMs}ms；${item.reason}`),
    "",
  ].join("\n");
  await writeFile(join(directory, "summary.txt"), text);
}

try {
  await mkdir(reports, { recursive: true });
  directory = await mkdtemp(join(reports, "fence-"));
  await summary("RUNNING");
  for (const [index, step] of steps.entries()) {
    const result = results[index]!;
    if (failed || interrupted) {
      result.reason = interrupted ? "收到中止信号" : "前置步骤失败，未执行";
      await writeFile(join(directory, `${step.name}.log`), `NOT_RUN：${result.reason}\n`);
      logs.add(step.name);
      continue;
    }
    result.status = "RUNNING";
    const start = Date.now();
    const child = Bun.spawn(step.command, { cwd: repository, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
    running = child;
    const stdout = new Response(child.stdout).text();
    const stderr = new Response(child.stderr).text();
    let timedOut = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    // 先 SIGTERM 给子进程收尾机会，超时强杀
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      forceTimer = setTimeout(() => child.kill("SIGKILL"), 10_000);
    }, step.timeout);
    let code: number;
    try {
      code = await child.exited;
    } finally {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      running = undefined;
    }
    result.exitCode = String(code);
    result.durationMs = Date.now() - start;
    result.status = code === 0 && !timedOut && !interrupted ? "PASS" : "FAIL";
    result.reason = timedOut ? "超时被终止" : interrupted ? "收到中止信号" : result.status === "PASS" ? "已执行" : "子进程非零退出";
    failed ||= result.status === "FAIL";
    await writeFile(
      join(directory, `${step.name}.log`),
      `command=${step.command.join(" ")}\nexit=${code}\n${await stdout}\n--- stderr ---\n${await stderr}\n`,
    );
    logs.add(step.name);
    console.log(`${step.name}：${result.status}，exit=${code}，${result.durationMs}ms`);
  }
} catch (error) {
  failed = true;
  console.error("fence 环境或报告写入失败：", error);
  const active = results.find((result) => result.status === "RUNNING") ?? results.find((result) => result.status === "NOT_RUN");
  if (active) {
    active.status = "FAIL";
    active.reason = "环境或报告写入失败";
  }
} finally {
  failed ||= interrupted;
  if (directory) {
    // 未产出日志的步骤补占位日志，保证每步一行留痕
    for (const item of results) {
      if (!logs.has(item.name)) {
        await writeFile(join(directory, `${item.name}.log`), `${item.status}；exit=${item.exitCode}；${item.reason}\n`);
      }
    }
    await summary(failed ? "FAIL" : "PASS");
  }
  console.log(`${failed ? "FAIL" : "PASS"} fence；汇总：${directory ? join(reports, "summary.txt") : "无法创建报告目录"}`);
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", interrupt);
  process.exitCode = failed ? 1 : 0;
}
