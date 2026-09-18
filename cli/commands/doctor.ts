// ocp doctor——环境自检（D15）：只报告不安装。检查项分级 PASS/WARN/FAIL，WARN 不阻断只提示。
// 配置二级查找：项目级 {wf}/doctor-config.json（ocp init 生成模板）→ 用户级 ~/.config/opencodepipe/doctor.json，
// 项目级优先，均无 → 相关项 WARN「未声明」。
// 探测函数全部接受注入参数（假配置/假目录/假探测函数），支持函数级断言；CLI 层默认注入真实环境。
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { brepoRoot } from "../brepo-root";

export type CheckLevel = "PASS" | "WARN" | "FAIL";

export interface CheckResult {
  /** 检查项名（稳定标识，供 --json 消费方引用） */
  name: string;
  level: CheckLevel;
  message: string;
}

export interface DoctorConfig {
  retrieval?: { primary?: string; fallback?: string; docs?: string };
  localARepoPath?: string;
}

export interface LoadedDoctorConfig {
  source: "project" | "user" | "none";
  config: DoctorConfig;
  /** 存在但解析失败时的错误描述（config 回退为空对象，不影响其余检查项） */
  error?: string;
}

/** 命令探测函数形态（Bun.which 兼容：返回路径或 null） */
export type Probe = (command: string) => string | null;

const AGENT_FILES = ["oracle.md", "explorer.md", "checker.md", "builder.md", "looker.md"] as const;

const RETRIEVAL_SLOTS = [
  { key: "primary", label: "主检索" },
  { key: "fallback", label: "回退检索" },
  { key: "docs", label: "库文档" },
] as const;

/** 读单级 doctor 配置文件：不存在 → null；存在但解析失败 → 抛出（上层转 error 描述） */
async function readConfigFile(path: string): Promise<DoctorConfig> {
  const text = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("顶层不是对象");
  }
  return parsed as DoctorConfig;
}

/** 二级配置查找：项目级优先 → 用户级；均无 → none。项目级存在但解析失败时不回退用户级（error 记录并报告，防掩盖问题）。 */
export async function loadDoctorConfig(projectWfDir: string, userConfigPath: string): Promise<LoadedDoctorConfig> {
  if (existsSync(projectWfDir)) {
    try {
      return { source: "project", config: await readConfigFile(projectWfDir) };
    } catch (error) {
      return { source: "project", config: {}, error: `${projectWfDir} 解析失败：${error instanceof Error ? error.message : String(error)}` };
    }
  }
  if (existsSync(userConfigPath)) {
    try {
      return { source: "user", config: await readConfigFile(userConfigPath) };
    } catch (error) {
      return { source: "none", config: {}, error: `${userConfigPath} 解析失败：${error instanceof Error ? error.message : String(error)}` };
    }
  }
  return { source: "none", config: {} };
}

/** git 版本检查：CLI 全命令的地基，不可用属确凿失败（FAIL） */
export function checkGit(probe: Probe = (cmd) => Bun.which(cmd), runVersion: () => string | null = gitVersion): CheckResult {
  const path = probe("git");
  if (!path) {
    return { name: "git", level: "FAIL", message: "git 不可用（pre-push 校验 / worktree / init --hook 均依赖 git）" };
  }
  const version = runVersion();
  if (version === null) {
    return { name: "git", level: "WARN", message: `git 可用（${path}）但 --version 执行失败` };
  }
  return { name: "git", level: "PASS", message: version };
}

/** 真实 git 版本获取（子进程），失败返回 null */
function gitVersion(): string | null {
  const result = Bun.spawnSync(["git", "--version"], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) return null;
  return result.stdout.toString().trim();
}

/** opencode 可用性：CLI 本体不依赖，缺失只影响 stage 插件宿主环境（WARN） */
export function checkOpencode(probe: Probe = (cmd) => Bun.which(cmd)): CheckResult {
  const path = probe("opencode");
  if (!path) {
    return { name: "opencode", level: "WARN", message: "opencode 不可用（stage 插件宿主缺失，不影响 ocp CLI 其余命令）" };
  }
  return { name: "opencode", level: "PASS", message: `可用（${path}）` };
}

/** plugin 段命中判定：opencode 挂载形态为 "plugin": ["file:///…/src/plugin/index.ts"]（S2 实证）；元素可为字符串或 [路径, 选项] 元组 */
function pluginMounted(plugin: unknown): boolean {
  if (!Array.isArray(plugin)) return false;
  return plugin.some((entry) => {
    const item = Array.isArray(entry) ? entry[0] : entry;
    return typeof item === "string" && (item.includes("opencodepipe") || item.includes("src/plugin"));
  });
}

/** opencode.json 单级读取：不存在 → null（该级未配置）；解析失败 → 抛出 */
async function readPluginConfig(path: string): Promise<unknown> {
  const json: unknown = JSON.parse(await readFile(path, "utf8"));
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("顶层不是对象");
  }
  return (json as Record<string, unknown>).plugin;
}

/** 插件挂载状态：读全局与项目 opencode.json 的 plugin 段，任一级命中即 PASS */
export async function checkPlugin(globalConfigPath: string, projectConfigPath: string): Promise<CheckResult> {
  const sources: Array<{ scope: string; path: string }> = [
    { scope: "项目", path: projectConfigPath },
    { scope: "全局", path: globalConfigPath },
  ];
  const mounted: string[] = [];
  const errors: string[] = [];
  for (const source of sources) {
    if (!existsSync(source.path)) continue;
    try {
      if (pluginMounted(await readPluginConfig(source.path))) {
        mounted.push(source.scope);
      }
    } catch (error) {
      errors.push(`${source.path} 解析失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (mounted.length > 0) {
    return { name: "opencode-plugin", level: "PASS", message: `已挂载（${mounted.join("+")}）` };
  }
  const detail = [
    errors.length > 0 ? errors.join("；") : "全局与项目 opencode.json 均未引用 opencodepipe 插件",
    `挂载形态参考："plugin": ["file:///<B仓>/src/plugin/index.ts"]`,
  ];
  return { name: "opencode-plugin", level: "WARN", message: detail.join("；") };
}

/** agents 五文件检查：全局 ~/.config/opencode/agents/ 与项目 .opencode/agent[s]/（调用方传入候选目录） */
export async function checkAgents(globalDir: string, projectDirs: string[]): Promise<CheckResult> {
  const scopes = [{ scope: "全局", dir: globalDir }, ...projectDirs.map((dir) => ({ scope: "项目", dir }))];
  const found: string[] = [];
  const missingReports: string[] = [];
  let anyDirExists = false;
  for (const scope of scopes) {
    if (!existsSync(scope.dir)) continue;
    anyDirExists = true;
    const missing = AGENT_FILES.filter((file) => !existsSync(join(scope.dir, file)));
    if (missing.length === 0) {
      found.push(scope.scope);
    } else {
      missingReports.push(`${scope.scope}缺 ${missing.join("、")}`);
    }
  }
  if (found.length > 0) {
    return { name: "agents", level: "PASS", message: `五文件齐全（${found.join("+")}）` };
  }
  if (!anyDirExists) {
    return { name: "agents", level: "WARN", message: "未发现 agents 目录（全局 ~/.config/opencode/agents/ 与项目 .opencode/agent[s]/ 均不存在）" };
  }
  return { name: "agents", level: "WARN", message: `五文件不全：${missingReports.join("；")}` };
}

/** 检索三通道：读声明（二级配置生效值）+ 命令探测；未声明/不可用均 WARN（异构环境不硬判 FAIL） */
export function checkRetrieval(config: DoctorConfig, probe: Probe = (cmd) => Bun.which(cmd)): CheckResult {
  const retrieval = config.retrieval ?? {};
  const parts: string[] = [];
  let allDeclared = true;
  let allAvailable = true;
  for (const slot of RETRIEVAL_SLOTS) {
    const command = retrieval[slot.key]?.trim();
    if (!command) {
      allDeclared = false;
      parts.push(`${slot.label} 未声明`);
      continue;
    }
    const path = probe(command.split(/\s+/)[0] ?? command);
    if (path) {
      parts.push(`${slot.label}：${command}（${path}）`);
    } else {
      allAvailable = false;
      parts.push(`${slot.label}：${command} 不可用`);
    }
  }
  const hint = allDeclared ? "" : "（编辑 {wf}/doctor-config.json 或 ~/.config/opencodepipe/doctor.json 声明）";
  const level: CheckLevel = allDeclared && allAvailable ? "PASS" : "WARN";
  return { name: "retrieval", level, message: `${parts.join("；")}${hint}` };
}

/** 文件 sha256（十六进制） */
async function sha256File(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

interface VendorSection {
  repo?: string;
  commit?: string;
  files?: Record<string, string>;
}

/**
 * vendored 状态：configs/vendor/specpipe/ 逐件哈希比对 transition-table.json 的 vendor 段声明（D6 形态，
 * 块D vendor-sync 首跑产出；此前无 vendor 段属预期 → WARN 未基线）。localARepoPath 以附注形式提示对比入口。
 * 哈希不匹配 = 篡改检测命中 → FAIL（确凿）；未铺设/未基线 = WARN。
 */
export async function checkVendored(root: string, config: DoctorConfig): Promise<CheckResult> {
  const tablePath = join(root, "configs", "transition-table.json");
  const vendorDir = join(root, "configs", "vendor", "specpipe");
  // localARepoPath 附注（各返回路径统一携带，不依赖 vendor 段存在与否）
  const localARepo = config.localARepoPath?.trim();
  const note = localARepo
    ? existsSync(localARepo)
      ? `；本地 A 仓：${localARepo}（可运行 bun scripts/vendor-sync.ts --path ${localARepo} 对比同步）`
      : `；本地 A 仓路径不存在：${localARepo}`
    : "";
  if (!existsSync(tablePath) || !existsSync(vendorDir)) {
    return { name: "vendored", level: "WARN", message: `vendored 未铺设（${vendorDir} 不存在）：先运行 bun scripts/vendor-sync.ts${note}` };
  }
  let vendor: VendorSection | undefined;
  try {
    const table: unknown = JSON.parse(await readFile(tablePath, "utf8"));
    if (table !== null && typeof table === "object" && !Array.isArray(table)) {
      vendor = (table as Record<string, unknown>).vendor as VendorSection | undefined;
    }
  } catch (error) {
    return { name: "vendored", level: "WARN", message: `transition-table.json 解析失败：${error instanceof Error ? error.message : String(error)}${note}` };
  }
  const files = vendor?.files;
  if (!files || Object.keys(files).length === 0) {
    return { name: "vendored", level: "WARN", message: `vendored 未基线（transition-table.json 无 vendor 段）：先运行 bun scripts/vendor-sync.ts${note}` };
  }
  const mismatches: string[] = [];
  for (const [relPath, declared] of Object.entries(files)) {
    const filePath = join(vendorDir, relPath);
    if (!existsSync(filePath)) {
      mismatches.push(`${relPath} 缺失`);
      continue;
    }
    const actual = await sha256File(filePath);
    if (actual !== declared) {
      mismatches.push(`${relPath} 哈希不匹配`);
    }
  }
  if (mismatches.length > 0) {
    return { name: "vendored", level: "FAIL", message: `哈希校验失败：${mismatches.join("；")}（${vendor?.commit ?? "未知 commit"}）${note}` };
  }
  return { name: "vendored", level: "PASS", message: `${Object.keys(files).length} 件一致（source commit：${vendor?.commit ?? "未知"}）${note}` };
}

/** opencode.json 整对象读取：不存在 → null（该级未配置）；解析失败/非对象 → 抛出 */
async function readConfigObject(path: string): Promise<Record<string, unknown> | null> {
  const json: unknown = JSON.parse(await readFile(path, "utf8"));
  if (json === null || typeof json !== "object" || Array.isArray(json)) {
    throw new Error("顶层不是对象");
  }
  return json as Record<string, unknown>;
}

/** agent md frontmatter 的 model 行提取：未声明/占位形态（含"用户决策位"）→ null */
async function readAgentFrontmatterModel(path: string): Promise<string | null> {
  try {
    const text = await readFile(path, "utf8");
    const match = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!match) return null;
    const modelLine = match[1].match(/^model:\s*(.+)$/m);
    if (!modelLine) return null;
    const value = modelLine[1].trim().replace(/^["']|["']$/g, "");
    return value.includes("用户决策位") ? null : value;
  } catch {
    return null; // 文件不存在等，视为未声明
  }
}

/** 模型路由建议检查（2026-09-18 用户策略）：非 Checker 角色用默认模型即可；checker 与 oracle/builder 同 modelId 时 WARN——跨家族交叉验证是 checker 选型的核心价值（同模型自审易同盲区） */
export async function checkModelRouting(
  globalConfigPath: string,
  projectConfigPath: string,
  agentsDirs: string[],
): Promise<CheckResult> {
  // 生效模型解析链（浅合并：项目级覆盖全局级）：opencode.json agent 段 → agent md frontmatter → <默认>
  const resolve = async (name: string): Promise<string> => {
    for (const path of [projectConfigPath, globalConfigPath]) {
      try {
        if (!existsSync(path)) continue;
        const config = await readConfigObject(path);
        const agentSection = config?.agent;
        if (agentSection && typeof agentSection === "object" && !Array.isArray(agentSection)) {
          const entry = (agentSection as Record<string, unknown>)[name];
          if (entry && typeof entry === "object") {
            const model = (entry as Record<string, unknown>).model;
            if (typeof model === "string" && model && !model.includes("用户决策位")) return model;
          }
        }
      } catch {
        // 配置解析失败不阻断：交给下一来源
      }
    }
    for (const dir of agentsDirs) {
      const fromFile = await readAgentFrontmatterModel(join(dir, `${name}.md`));
      if (fromFile) return fromFile;
    }
    return "<默认>";
  };
  const [oracleModel, checkerModel, builderModel] = await Promise.all([resolve("oracle"), resolve("checker"), resolve("builder")]);
  const clashes: string[] = [];
  if (checkerModel === oracleModel) clashes.push(`oracle=${oracleModel}`);
  if (checkerModel === builderModel) clashes.push(`builder=${builderModel}`);
  if (clashes.length > 0) {
    const sameDefault = checkerModel === "<默认>";
    return {
      name: "agent-model",
      level: "WARN",
      message: `${sameDefault ? "checker 未显式配置（与 oracle/builder 同用默认模型）" : `checker 与 ${clashes.join("、")} 的模型相同（${checkerModel}）`}——交叉验证效果弱；建议 checker 选不同家族（provider 前缀）的模型，配置模板见 B仓 docs/agents-adoption.md example-2`,
    };
  }
  return { name: "agent-model", level: "PASS", message: `checker=${checkerModel} 与 oracle=${oracleModel} / builder=${builderModel} 跨模型，交叉验证就绪` };
}

/** 命令行入口：--json / --help。退出码：有 FAIL → 1（检查失败），否则 0 */
export async function main(args: string[], ctx: { cwd: string }): Promise<number> {
  let json = false;
  for (const arg of args) {
    if (arg === "--json") {
      json = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log("用法：ocp doctor [--json]\n环境自检（git / opencode 与插件挂载 / agents 五文件 / 模型路由建议 / 检索三通道 / vendored 状态）；只报告不安装");
      return 0;
    } else {
      console.error(`未知参数：${arg}\n用法：ocp doctor [--json]`);
      return 2;
    }
  }
  const home = homedir();
  const projectWfDir = join(ctx.cwd, ".specpipe", "doctor-config.json");
  const userConfigPath = join(home, ".config", "opencodepipe", "doctor.json");
  const loaded = await loadDoctorConfig(projectWfDir, userConfigPath);
  const results: CheckResult[] = [
    checkGit(),
    checkOpencode(),
    await checkPlugin(join(home, ".config", "opencode", "opencode.json"), join(ctx.cwd, "opencode.json")),
    await checkAgents(join(home, ".config", "opencode", "agents"), [join(ctx.cwd, ".opencode", "agents"), join(ctx.cwd, ".opencode", "agent")]),
    await checkModelRouting(
      join(home, ".config", "opencode", "opencode.json"),
      join(ctx.cwd, "opencode.json"),
      [join(home, ".config", "opencode", "agents"), join(ctx.cwd, ".opencode", "agents"), join(ctx.cwd, ".opencode", "agent")],
    ),
    checkRetrieval(loaded.config),
    await checkVendored(brepoRoot(), loaded.config),
  ];
  if (loaded.error) {
    results.push({ name: "doctor-config", level: "WARN", message: loaded.error });
  }
  const counts = {
    pass: results.filter((r) => r.level === "PASS").length,
    warn: results.filter((r) => r.level === "WARN").length,
    fail: results.filter((r) => r.level === "FAIL").length,
  };
  if (json) {
    console.log(JSON.stringify({ configSource: loaded.source, results, counts }, null, 2));
  } else {
    console.log(`ocp doctor —— 环境自检（配置来源：${loaded.source === "none" ? "未发现（相关项按未声明报告）" : loaded.source === "project" ? "项目级 {wf}/doctor-config.json" : "用户级 ~/.config/opencodepipe/doctor.json"}）`);
    for (const result of results) {
      console.log(`[${result.level}] ${result.name}：${result.message}`);
    }
    console.log(`汇总：PASS ${counts.pass} / WARN ${counts.warn} / FAIL ${counts.fail}`);
  }
  return counts.fail > 0 ? 1 : 0;
}
