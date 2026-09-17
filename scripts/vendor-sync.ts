// vendored 副本同步（D8，判据钉死）——A 仓契约文件（07 卷 + templates 九件）入库快照的维护入口。
// 用法：bun run scripts/vendor-sync.ts --path <本地A仓目录> | --tag <A仓tag>
// 流程：读旧 vendor 段 → 复制十件 → 重算哈希更新 vendor 段与 source → 判据（钉死）：
//   首跑（无旧声明）→ 提示「首次基线」，0 退出（视同哈希变化路径但不阻断——基线尚未建立无从比对）；
//   新 07 哈希 ≠ 旧声明 → 「契约已变，边集需人工适配（开 B 仓 Story/Issue 走审查）」，1 退出；
//   07 哈希未变 → 跑三层一致性对账（复用 check-tools/transition-consistency），失败才 1 退出。
// --tag 时 clone vendor.repo（首跑前无声明则用内置常量）到临时目录，失败非零退出 + 明确提示，临时目录用后即删。
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkTransitionConsistency,
  formatConsistencyResult,
  sha256File,
  VENDOR_FILE_PATHS,
  VENDOR_KEY_07,
} from "../check-tools/transition-consistency";

/** A 仓远端地址——vendor 段尚未建立（首跑）时 --tag clone 的默认源 */
const DEFAULT_REPO = "https://github.com/jiazhousa/SpecPipe";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));
const defaultConfigsDir = join(repositoryRoot, "configs");

export interface VendorSyncResult {
  /** 进程退出码：0=成功/首次基线；1=契约已变/对账失败/环境错误；2=用法错误（仅 main） */
  code: number;
  /** 逐行人读输出（main 打印；测试断言消费，不直接 console） */
  lines: string[];
}

export interface VendorSyncOptions {
  /** A 仓根目录（须含 07-state-machine.md 与 templates/ 九件） */
  sourceDir: string;
  /** B 仓 configs/ 目录（transition-table.json 与 vendor/ 所在地） */
  configsDir: string;
  /** 本次同步基线 commit（调用侧 git rev-parse 解析后注入；测试可直接给假值） */
  commit: string;
}

/** vendor 段既有声明（判据用）；宽松形态，异常形态视同首跑 */
interface OldVendor {
  repo?: string;
  commit?: string;
  files?: Record<string, string>;
}

/** 核心同步逻辑（可测）：复制 + 哈希更新 + 判据判定 */
export async function runVendorSync(options: VendorSyncOptions): Promise<VendorSyncResult> {
  const { sourceDir, configsDir, commit } = options;
  const vendorRoot = join(configsDir, "vendor", "specpipe");
  // 源文件齐全性：十件缺一即拒（半量复制会产生残缺基线）
  const missing = VENDOR_FILE_PATHS.filter((rel) => !existsSync(join(sourceDir, rel)));
  if (missing.length > 0) {
    return { code: 1, lines: [`A 仓缺少契约文件：${missing.join("、")}（源目录 ${sourceDir}）`] };
  }
  // 读旧 vendor 段（transition-table.json）
  const tablePath = join(configsDir, "transition-table.json");
  let oldVendor: OldVendor | undefined;
  try {
    const table = JSON.parse(await readFile(tablePath, "utf8")) as { vendor?: OldVendor };
    oldVendor = table.vendor;
  } catch (error) {
    return { code: 1, lines: [`无法读取或解析 ${tablePath}：${error instanceof Error ? error.message : String(error)}`] };
  }
  const firstRun = !oldVendor || typeof oldVendor !== "object" || !oldVendor.files || typeof oldVendor.files !== "object";
  // 复制十件 + 重算哈希
  const files: Record<string, string> = {};
  for (const rel of VENDOR_FILE_PATHS) {
    const dest = join(vendorRoot, rel);
    await mkdir(dirname(dest), { recursive: true });
    await cp(join(sourceDir, rel), dest);
    files[rel] = sha256File(dest);
  }
  // 更新 vendor 段与 source（判据判定前落盘：契约已变路径下 vendored 副本与声明反映 A 仓最新，转移表待人工重推导）
  const repo = oldVendor?.repo ?? DEFAULT_REPO;
  try {
    await patchTableFile(tablePath, commit, renderVendorSection(repo, commit, files), files);
  } catch (error) {
    return { code: 1, lines: [`更新 ${tablePath} 失败：${error instanceof Error ? error.message : String(error)}`] };
  }
  // ---- 判据（钉死）----
  if (firstRun) {
    return {
      code: 0,
      lines: [
        `首次基线：已复制 07 + templates 九件至 ${vendorRoot}，并写入 vendor 声明段（commit ${commit}，十件 sha256）。`,
        "转移表 / 快照 / vendored 的一致性由 ocp check transition-consistency 与 fence 第四步对账。",
      ],
    };
  }
  const old07 = oldVendor!.files![VENDOR_KEY_07];
  if (old07 === undefined || files[VENDOR_KEY_07] !== old07) {
    return {
      code: 1,
      lines: [
        `契约已变：${VENDOR_KEY_07} 哈希 ≠ vendor 段旧声明（旧 ${old07 === undefined ? "声明缺失" : `${old07.slice(0, 12)}…`} 新 ${files[VENDOR_KEY_07]!.slice(0, 12)}…）。`,
        "边集需人工适配（开 B 仓 Story/Issue 走审查）：vendored 副本与 vendor 段已更新至新基线，转移表 states/transitions 待人工重推导。",
      ],
    };
  }
  // 07 哈希未变：模板层若有变化仅同步副本（不影响边集），随后跑三层一致性对账
  const changedTemplates = VENDOR_FILE_PATHS.filter((rel) => rel !== VENDOR_KEY_07 && oldVendor!.files![rel] !== files[rel]);
  const consistency = checkTransitionConsistency(configsDir);
  const lines = [
    `07 哈希未变，契约稳定。${changedTemplates.length > 0 ? `templates 有 ${changedTemplates.length} 件哈希变化，模板层已同步。` : "十件哈希全部一致。"}`,
    formatConsistencyResult(consistency),
  ];
  return { code: consistency.pass ? 0 : 1, lines };
}

/** vendor 段文本渲染（风格对齐数据文件：2 空格缩进、files 每件一行；值均为受控字符集，经 JSON.stringify 转义兜底） */
function renderVendorSection(repo: string, commit: string, files: Record<string, string>): string {
  const entries = VENDOR_FILE_PATHS.map((rel) => `      ${JSON.stringify(rel)}: ${JSON.stringify(files[rel]!)}`);
  return ["  \"vendor\": {", `    "repo": ${JSON.stringify(repo)},`, `    "commit": ${JSON.stringify(commit)},`, "    \"files\": {", entries.join(",\n"), "    }", "  }"].join("\n");
}

/**
 * 定点文本编辑更新 source 行与 vendor 段——states/transitions/history/notes 原文零触碰（最小 diff，
 * 保持 S2 交付的紧凑单行对象排版，不做全量 JSON.stringify 重排）。写回后 JSON.parse 复核，失败抛错。
 */
async function patchTableFile(tablePath: string, commit: string, vendorText: string, files: Record<string, string>): Promise<void> {
  let text = await readFile(tablePath, "utf8");
  // source 行定点替换（若值已一致则零 diff）
  const patchedSource = text.replace(/^(\s*"source":\s*)"[^"]*"/m, `$1${JSON.stringify(commit)}`);
  if (patchedSource === text && !new RegExp(`^\\s*"source":\\s*"${commit}"`, "m").test(text)) {
    throw new Error("未定位到 source 行（数据文件格式异常）");
  }
  text = patchedSource;
  const vendorStart = text.search(/^  "vendor": \{$/m);
  if (vendorStart !== -1) {
    // 既有 vendor 段（自产格式，位于最后一个顶层段）：截断重建；段后若存在其他顶层段则拒绝
    const tail = text.slice(vendorStart);
    if (!/^  "vendor": \{[\s\S]*\n  \}\n\}\n$/.test(tail)) {
      throw new Error("vendor 段不在文件收尾或格式无法识别（数据文件格式异常）");
    }
    text = `${text.slice(0, vendorStart)}${vendorText}\n}\n`;
  } else if (/\n\}\n$/.test(text)) {
    // 无 vendor 段：在顶层收尾 } 前插入（前一顶层段补逗号）
    text = text.replace(/\n\}\n$/, `,\n${vendorText}\n}\n`);
  } else {
    throw new Error("未定位到顶层收尾（数据文件格式异常）");
  }
  await writeFile(tablePath, text);
  // 写回复核：source 与 vendor 段语义正确、其余段未被破坏
  const verify = JSON.parse(await readFile(tablePath, "utf8")) as {
    source?: string;
    states?: unknown[];
    transitions?: unknown[];
    history?: unknown;
    notes?: unknown;
    vendor?: { repo?: string; commit?: string; files?: Record<string, string> };
  };
  if (verify.source !== commit) throw new Error("写回复核失败：source 未更新");
  if (verify.vendor?.repo === undefined || verify.vendor.commit !== commit) throw new Error("写回复核失败：vendor 段元信息异常");
  const declared = verify.vendor.files ?? {};
  if (Object.keys(declared).length !== VENDOR_FILE_PATHS.length || !VENDOR_FILE_PATHS.every((rel) => declared[rel] === files[rel])) {
    throw new Error("写回复核失败：vendor.files 与本次重算哈希不一致");
  }
  if (!Array.isArray(verify.states) || verify.states.length === 0 || !Array.isArray(verify.transitions) || verify.transitions.length === 0) {
    throw new Error("写回复核失败：states/transitions 段被破坏");
  }
  // history/notes 为 S2 交付必有段——缺失说明截断重建误伤（vendor 段后存在其他顶层段的异常形态）
  if (!verify.history || typeof verify.history !== "object" || !verify.notes || typeof verify.notes !== "object") {
    throw new Error("写回复核失败：history/notes 段缺失（疑似 vendor 段定位误伤）");
  }
}

/** 解析目录的 HEAD commit；失败返回 null（非 git 目录 / 无提交） */
function resolveCommit(dir: string): string | null {
  const proc = Bun.spawnSync(["git", "-C", dir, "rev-parse", "HEAD"]);
  if (proc.exitCode !== 0) return null;
  return proc.stdout.toString().trim();
}

/** 读既有 vendor.repo（--tag clone 源优先用声明值）；读取失败回落内置常量 */
async function readDeclaredRepo(configsDir: string): Promise<string> {
  try {
    const table = JSON.parse(await readFile(join(configsDir, "transition-table.json"), "utf8")) as { vendor?: OldVendor };
    if (table.vendor?.repo && typeof table.vendor.repo === "string") return table.vendor.repo;
  } catch {
    // 读不到声明（首跑）——回落默认常量
  }
  return DEFAULT_REPO;
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const usage = "用法：bun run scripts/vendor-sync.ts --path <本地A仓目录> | --tag <A仓tag>";
  // 合法形态恰为两参：args[0] 是 --path 或 --tag 之一（互斥），args[1] 为其值
  if (args.length !== 2 || (args[0] !== "--path" && args[0] !== "--tag")) {
    console.error(usage);
    return 2;
  }
  const configsDir = defaultConfigsDir;
  if (args[0] === "--path") {
    const sourceDir = resolve(args[1]!);
    if (!existsSync(sourceDir)) {
      console.error(`A 仓目录不存在：${sourceDir}`);
      return 1;
    }
    const commit = resolveCommit(sourceDir);
    if (!commit) {
      console.error(`无法解析 A 仓 commit（${sourceDir} 非 git 仓库或无提交）`);
      return 1;
    }
    const result = await runVendorSync({ sourceDir, configsDir, commit });
    for (const line of result.lines) console.log(line);
    return result.code;
  }
  // --tag：clone 到临时目录，用后即删
  const tag = args[1]!;
  const repo = await readDeclaredRepo(configsDir);
  const tempDir = await mkdtemp(join(tmpdir(), "ocp-vendor-"));
  try {
    const clone = Bun.spawnSync(["git", "clone", "--branch", tag, "--depth", "1", repo, tempDir]);
    if (clone.exitCode !== 0) {
      console.error(`克隆失败（${repo} tag=${tag}）：${clone.stderr.toString().trim()}`);
      console.error("请检查网络连通性、tag 是否存在、或改用 --path 指向本地 A 仓。");
      return 1;
    }
    const commit = resolveCommit(tempDir);
    if (!commit) {
      console.error(`克隆成功但无法解析 commit（${repo}#${tag}）`);
      return 1;
    }
    const result = await runVendorSync({ sourceDir: tempDir, configsDir, commit });
    for (const line of result.lines) console.log(line);
    return result.code;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  process.exitCode = await main();
}
