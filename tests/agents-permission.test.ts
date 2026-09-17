// agents 五角色定义文件的结构与权限守护测试（v1 迁移资产）。
// 简易解析 agents/*.md 的 frontmatter（YAML 子集：顶层标量 + 一层嵌套 map，不引依赖），
// 断言权限白名单结构与迁移适配点（模型占位、示例值声明、对口 08-roles.md 声明、QUALITY_GATE→DONE 分工加注）。
// 注意：白名单中的检索命令/绝对路径条目为示例值（文件头声明用户决策位），
// 按环境增删后需同步本测试的期望（改定义必须过测试，防止权限结构意外漂移）。
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const AGENTS_DIR = join(import.meta.dir, "..", "agents");

const ROLE_FILES = ["oracle.md", "explorer.md", "checker.md", "builder.md", "looker.md"] as const;

// ---- 简易 frontmatter 解析（YAML 子集：顶层标量 / 两层缩进 map，如 permission.edit.* / permission.bash.*）----

type YamlValue = string | YamlMap;
interface YamlMap extends Record<string, YamlValue> {}
type Frontmatter = YamlMap;

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

/** 去除 YAML 标量两侧引号（单/双引号） */
function stripQuotes(v: string): string {
  if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;
  const result: Frontmatter = {};
  // level1：permission 这类顶层 map；level2：edit/bash 这类二级 map（值为标量的白名单条目）
  let level1: Record<string, YamlValue> | null = null;
  let level2: Record<string, string> | null = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (line.trim() === "" || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    const m = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    const key = stripQuotes(m[1].trim());
    const value = stripQuotes(m[2].trim());
    if (indent === 0) {
      level1 = null;
      level2 = null;
      if (value === "") {
        level1 = {};
        result[key] = level1;
      } else {
        result[key] = value;
      }
    } else if (indent <= 2) {
      // 一级白名单条目（permission 的直接子项）；key 允许带引号（如 "*": "deny"）
      level2 = null;
      if (level1 === null) continue;
      if (value === "") {
        const child: Record<string, string> = {};
        level1[key] = child;
        level2 = child;
      } else {
        level1[key] = value;
      }
    } else {
      // 二级白名单条目（edit/bash 的子项）
      if (level2 === null) continue;
      level2[key] = value;
    }
  }
  return result;
}

// ---- 读取与取段辅助 ----

function readAgent(name: string): { content: string; fm: Frontmatter; body: string } {
  const content = readFileSync(join(AGENTS_DIR, name), "utf8");
  const fm = parseFrontmatter(content);
  if (!fm) throw new Error(`${name} 缺少 frontmatter`);
  const body = content.replace(FRONTMATTER_RE, "");
  return { content, fm, body };
}

function permissionOf(name: string): Record<string, YamlValue> {
  const perm = readAgent(name).fm.permission;
  if (typeof perm !== "object" || perm === null) {
    throw new Error(`${name} frontmatter 缺少 permission 段`);
  }
  return perm;
}

/** 取 permission 下的一段，断言其为白名单 map（而非 deny/allow 标量，且条目全为标量——本子集不支持三级嵌套） */
function mapOf(perm: Record<string, YamlValue>, key: string): Record<string, string> {
  const v = perm[key];
  if (typeof v !== "object" || v === null) {
    throw new Error(`permission.${key} 应为白名单 map，实际为 ${JSON.stringify(v)}`);
  }
  if (Object.values(v).some((val) => typeof val !== "string")) {
    throw new Error(`permission.${key} 含非标量条目（本仓 YAML 子集不支持三级嵌套）`);
  }
  return v as Record<string, string>;
}

// ---- 断言 ----

describe("agents 五角色定义（v1 迁移资产）", () => {
  test("五文件 frontmatter 均可解析且声明 mode", () => {
    for (const name of ROLE_FILES) {
      const { fm } = readAgent(name);
      expect(typeof fm.mode === "string").toBe(true);
    }
  });

  test("五文件均含对口 08-roles.md 的文件头声明（frontmatter 后正文起始处）", () => {
    for (const name of ROLE_FILES) {
      const { body } = readAgent(name);
      expect(body.slice(0, 400)).toContain("08-roles.md");
    }
  });

  test("oracle：model/variant 为占位形态，不含写死的模型选型", () => {
    const { fm, content } = readAgent("oracle.md");
    // 占位形态：值内含「用户决策位」标注
    expect(String(fm.model)).toContain("用户决策位");
    expect(String(fm.variant)).toContain("用户决策位");
    // 不含写死选型：frontmatter 原文无具体 provider/model 与 variant 字面量
    expect(content).not.toMatch(/^model:\s*["']?[a-z][\w.-]+\/[\w.-]+\s*$/m);
    expect(content).not.toMatch(/^variant:\s*["']?(max|high|low)\s*$/m);
  });

  test("explorer：edit/write 全 deny，bash 白名单仅只读命令且兜底 deny", () => {
    const perm = permissionOf("explorer.md");
    expect(perm.edit).toBe("deny");
    expect(perm.write).toBe("deny");
    expect(perm.apply_patch).toBe("deny");
    const bash = mapOf(perm, "bash");
    // 兜底 deny
    expect(bash["*"]).toBe("deny");
    const allowed = Object.entries(bash)
      .filter(([, v]) => v === "allow")
      .map(([k]) => k);
    expect(allowed.length).toBeGreaterThan(0);
    // 检索命令（示例值）在位：ws/exa/tvly/ctx7
    for (const probe of ["ws", "exa", "tvly", "ctx7"]) {
      expect(allowed.some((c) => c === probe || c.startsWith(probe + " "))).toBe(true);
    }
    // 无写类/git 变更类命令
    const forbiddenPatterns: RegExp[] = [
      // git 只读子命令（status/log/show/diff）之外的一切 git 操作
      /^git\s+(?!status\b|log\b|show\b|diff\b)/,
      // 写类文件操作 / 权限变更
      /\b(rm|mv|cp|mkdir|touch|tee|truncate|chmod|chown)\b/,
      // git 变更类子命令
      /\b(commit|push|checkout|switch|restore|stash|rebase|merge|reset|cherry-pick|clean|tag|clone|fetch|pull|add)\b/,
      // 包管理安装类
      /(^|\s)(npm|pnpm|yarn|pip|apt|brew|cargo)\s+(install|add|uninstall|remove)\b/,
      // 输出重定向（> file / >> file）
      />>?\s/,
    ];
    for (const cmd of allowed) {
      for (const re of forbiddenPatterns) {
        expect(re.test(cmd)).toBe(false);
      }
    }
  });

  test("checker：edit 白名单限 .specpipe/reviews 与 .specpipe/plans，bash 编译测试命令在位且兜底 deny", () => {
    const perm = permissionOf("checker.md");
    const edit = mapOf(perm, "edit");
    expect(edit["*"]).toBe("deny");
    const editKeys = Object.keys(edit);
    expect(editKeys.some((k) => k.startsWith(".specpipe/reviews"))).toBe(true);
    expect(editKeys.some((k) => k.startsWith(".specpipe/plans"))).toBe(true);
    // edit 段所有 allow 条目必须落在 reviews / plans 路径内（含绝对路径示例条目）
    for (const [k, v] of Object.entries(edit)) {
      if (v === "allow") {
        expect(/(\.specpipe\/reviews|\.specpipe\/plans)/.test(k)).toBe(true);
      }
    }
    const bash = mapOf(perm, "bash");
    expect(bash["*"]).toBe("deny");
    for (const cmd of ["mvn *", "npm *", "npx *", "pytest *", "python *", "python3 *"]) {
      expect(bash[cmd]).toBe("allow");
    }
    // write/apply_patch 硬禁（报告与 .stage 走 edit 白名单）
    expect(perm.write).toBe("deny");
    expect(perm.apply_patch).toBe("deny");
  });

  test("checker 正文含 QUALITY_GATE→DONE 调度者终检分工加注", () => {
    const { body } = readAgent("checker.md");
    expect(body).toMatch(/QUALITY_GATE → DONE.*由调度者终检汇合执行/s);
    expect(body).toContain("07-state-machine.md");
  });

  test("builder：edit/bash/write 白名单全量 allow（编码执行角色）", () => {
    const perm = permissionOf("builder.md");
    expect(mapOf(perm, "edit")["*"]).toBe("allow");
    expect(mapOf(perm, "bash")["*"]).toBe("allow");
    expect(mapOf(perm, "write")["*"]).toBe("allow");
  });

  test("looker：只读（edit/bash/write/apply_patch 全 deny）", () => {
    const perm = permissionOf("looker.md");
    expect(perm.edit).toBe("deny");
    expect(perm.bash).toBe("deny");
    expect(perm.write).toBe("deny");
    expect(perm.apply_patch).toBe("deny");
  });
});
