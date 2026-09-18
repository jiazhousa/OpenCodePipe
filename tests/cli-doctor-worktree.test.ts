// ocp doctor / worktree 测试——doctor 探测函数级断言（注入假配置/假目录/假探测函数，不依赖真实环境）；
// worktree 分支名三级校验与基准解析纯函数正反用例（不真建 worktree）；附 CLI 路由退出码约定。
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main as cliMain } from "../cli/index";
import {
  checkAgents,
  checkGit,
  checkOpencode,
  checkPlugin,
  checkModelRouting,
  checkRetrieval,
  checkVendored,
  loadDoctorConfig,
  type Probe,
} from "../cli/commands/doctor";
import { loadWorktreeConfig, resolveBaseBranch, validateBranchName, type WorktreeConfig } from "../cli/commands/worktree";

let base: string;

beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "ocp-doctor-test-"));
});

afterEach(async () => {
  await rm(base, { recursive: true, force: true });
});

// ---- doctor：二级配置查找（D15）----

describe("loadDoctorConfig", () => {
  test("项目级优先于用户级", async () => {
    const projectPath = join(base, "project.json");
    const userPath = join(base, "user.json");
    await writeFile(projectPath, JSON.stringify({ localARepoPath: "/from-project" }));
    await writeFile(userPath, JSON.stringify({ localARepoPath: "/from-user" }));
    const loaded = await loadDoctorConfig(projectPath, userPath);
    expect(loaded.source).toBe("project");
    expect(loaded.config.localARepoPath).toBe("/from-project");
  });

  test("项目级缺失回退用户级；均无 → none", async () => {
    const userPath = join(base, "user.json");
    await writeFile(userPath, JSON.stringify({ localARepoPath: "/from-user" }));
    const fallback = await loadDoctorConfig(join(base, "absent.json"), userPath);
    expect(fallback.source).toBe("user");
    expect(fallback.config.localARepoPath).toBe("/from-user");
    const none = await loadDoctorConfig(join(base, "absent.json"), join(base, "absent2.json"));
    expect(none.source).toBe("none");
    expect(none.config).toEqual({});
  });

  test("项目级存在但解析失败：不静默回退，记录 error", async () => {
    const projectPath = join(base, "project.json");
    const userPath = join(base, "user.json");
    await writeFile(projectPath, "{ not json");
    await writeFile(userPath, JSON.stringify({ localARepoPath: "/from-user" }));
    const loaded = await loadDoctorConfig(projectPath, userPath);
    expect(loaded.source).toBe("project");
    expect(loaded.config).toEqual({});
    expect(loaded.error).toContain("解析失败");
  });
});

// ---- doctor：探测函数（注入假探测/假目录）----

describe("checkGit / checkOpencode", () => {
  const found: Probe = () => "/usr/bin/found";
  const notFound: Probe = () => null;

  test("git 可用且 --version 成功 → PASS", () => {
    const result = checkGit(found, () => "git version 2.43.0");
    expect(result.level).toBe("PASS");
    expect(result.message).toContain("git version 2.43.0");
  });

  test("git 不可用 → FAIL；可用但 --version 失败 → WARN", () => {
    expect(checkGit(notFound, () => null).level).toBe("FAIL");
    expect(checkGit(found, () => null).level).toBe("WARN");
  });

  test("opencode 不可用只 WARN（不影响 CLI 其余命令）", () => {
    expect(checkOpencode(found).level).toBe("PASS");
    const warn = checkOpencode(notFound);
    expect(warn.level).toBe("WARN");
    expect(warn.message).toContain("stage 插件宿主");
  });
});

describe("checkPlugin", () => {
  test("全局 file:// 挂载命中 → PASS", async () => {
    const globalPath = join(base, "global-opencode.json");
    await writeFile(globalPath, JSON.stringify({ plugin: ["file:///x/opencodepipe/src/plugin/index.ts"] }));
    const result = await checkPlugin(globalPath, join(base, "absent.json"));
    expect(result.level).toBe("PASS");
    expect(result.message).toContain("全局");
  });

  test("两级均未挂载 → WARN；plugin 段形态非法不炸（视为未挂载）", async () => {
    const globalPath = join(base, "global-opencode.json");
    const projectPath = join(base, "project-opencode.json");
    await writeFile(globalPath, JSON.stringify({ plugin: ["some-other-plugin"] }));
    await writeFile(projectPath, JSON.stringify({ plugin: "not-an-array" }));
    const result = await checkPlugin(globalPath, projectPath);
    expect(result.level).toBe("WARN");
    expect(result.message).toContain("未引用");
  });

  test("配置文件解析失败 → WARN 且 message 含路径", async () => {
    const broken = join(base, "broken.json");
    await writeFile(broken, "{oops");
    const result = await checkPlugin(broken, join(base, "absent.json"));
    expect(result.level).toBe("WARN");
    expect(result.message).toContain("解析失败");
  });
});

describe("checkAgents", () => {
  const AGENT_FILES = ["oracle.md", "explorer.md", "checker.md", "builder.md", "looker.md"];

  async function makeAgentsDir(dir: string, files: string[]): Promise<string> {
    await mkdir(dir, { recursive: true });
    for (const file of files) {
      await writeFile(join(dir, file), `agent ${file}\n`);
    }
    return dir;
  }

  test("全局五件齐全 → PASS", async () => {
    const globalDir = await makeAgentsDir(join(base, "agents"), AGENT_FILES);
    const result = await checkAgents(globalDir, []);
    expect(result.level).toBe("PASS");
  });

  test("缺件 → WARN 且列缺件名", async () => {
    const globalDir = await makeAgentsDir(join(base, "agents"), AGENT_FILES.slice(0, 3));
    const result = await checkAgents(globalDir, []);
    expect(result.level).toBe("WARN");
    expect(result.message).toContain("builder.md");
    expect(result.message).toContain("looker.md");
  });

  test("项目级目录可补齐全局缺件 → PASS", async () => {
    const globalDir = await makeAgentsDir(join(base, "agents"), AGENT_FILES.slice(0, 2));
    const projectDir = await makeAgentsDir(join(base, ".opencode", "agents"), AGENT_FILES);
    const result = await checkAgents(globalDir, [projectDir]);
    expect(result.level).toBe("PASS");
    expect(result.message).toContain("项目");
  });

  test("两级目录均不存在 → WARN", async () => {
    const result = await checkAgents(join(base, "absent"), [join(base, "absent2")]);
    expect(result.level).toBe("WARN");
    expect(result.message).toContain("未发现 agents 目录");
  });
});

describe("checkRetrieval", () => {
  const allFound: Probe = (cmd) => `/usr/bin/${cmd}`;

  test("三位全声明全可用 → PASS", () => {
    const result = checkRetrieval({ retrieval: { primary: "ws", fallback: "tvly", docs: "ctx7" } }, allFound);
    expect(result.level).toBe("PASS");
    expect(result.message).toContain("ws");
    expect(result.message).toContain("ctx7");
  });

  test("未声明 → WARN 含声明指引；声明但不可用 → WARN", () => {
    const undeclared = checkRetrieval({}, allFound);
    expect(undeclared.level).toBe("WARN");
    expect(undeclared.message).toContain("未声明");
    expect(undeclared.message).toContain("doctor-config.json");
    const unavailable = checkRetrieval({ retrieval: { primary: "ws" } }, () => null);
    expect(unavailable.level).toBe("WARN");
    expect(unavailable.message).toContain("不可用");
  });

  test("声明含参数形态（如 'ws --json'）按首 token 探测", () => {
    const result = checkRetrieval({ retrieval: { primary: "ws --json" } }, (cmd) => (cmd === "ws" ? "/usr/bin/ws" : null));
    expect(result.message).toContain("ws --json（/usr/bin/ws）");
  });
});

describe("checkVendored", () => {
  /** 造一个假 B 仓根：vendor 段声明两件 + configs/vendor/specpipe/ 实际两件，返回 {root, files} */
  async function makeFakeBrepo(tamper?: "07" | "missing"): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), "ocp-vendor-"));
    const vendorDir = join(root, "configs", "vendor", "specpipe");
    await mkdir(join(vendorDir, "templates"), { recursive: true });
    const files: Record<string, string> = {};
    const p07 = join(vendorDir, "07-state-machine.md");
    const pTpl = join(vendorDir, "templates", "spec-template.md");
    await writeFile(p07, "state machine contract v1\n");
    await writeFile(pTpl, "spec template v1\n");
    files["07-state-machine.md"] = createHash("sha256").update("state machine contract v1\n").digest("hex");
    files["templates/spec-template.md"] = createHash("sha256").update("spec template v1\n").digest("hex");
    if (tamper === "07") {
      await writeFile(p07, "tampered\n");
    } else if (tamper === "missing") {
      await rm(pTpl);
    }
    await writeFile(
      join(root, "configs", "transition-table.json"),
      JSON.stringify({ version: 1, vendor: { repo: "https://example/specpipe", commit: "abc123", files }, states: [], transitions: [] }),
    );
    return root;
  }

  test("全件一致 → PASS（含 commit 与 localARepoPath 附注）", async () => {
    const root = await makeFakeBrepo();
    try {
      const result = await checkVendored(root, { localARepoPath: base });
      expect(result.level).toBe("PASS");
      expect(result.message).toContain("2 件一致");
      expect(result.message).toContain("abc123");
      expect(result.message).toContain("vendor-sync");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("篡改 07 卷 → FAIL；声明件缺失 → FAIL", async () => {
    for (const tamper of ["07", "missing"] as const) {
      const root = await makeFakeBrepo(tamper);
      try {
        const result = await checkVendored(root, {});
        expect(result.level).toBe("FAIL");
        expect(result.message).toContain(tamper === "07" ? "哈希不匹配" : "缺失");
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    }
  });

  test("无 vendor 段（块D 未基线）→ WARN 提示 vendor-sync；localARepoPath 不存在也附注", async () => {
    const root = await makeFakeBrepo();
    try {
      await writeFile(join(root, "configs", "transition-table.json"), JSON.stringify({ version: 1, states: [], transitions: [] }));
      const result = await checkVendored(root, { localARepoPath: "/definitely/absent/path" });
      expect(result.level).toBe("WARN");
      expect(result.message).toContain("vendor-sync");
      expect(result.message).toContain("不存在");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  test("vendored 目录整体未铺设 → WARN", async () => {
    const result = await checkVendored(join(base, "absent-brepo"), {});
    expect(result.level).toBe("WARN");
    expect(result.message).toContain("未铺设");
  });
});

// ---- worktree：三级校验与基准解析（纯函数，不真建）----

const CONFIG: WorktreeConfig = {
  targets: ["dev", "rel", "ms"],
  kinds: ["feat", "fix", "chore"],
  worktreeDir: "../.ocp-worktrees",
  baseMap: { dev: "develop" },
};

describe("validateBranchName（D17）", () => {
  test.each([
    "dev/feat/bd-score-panel",
    "rel/fix/a",
    "ms/chore/x-y2",
    "dev/fix/a-b-c",
  ])("合法：%s", (branch) => {
    const result = validateBranchName(branch, CONFIG);
    expect(result.ok).toBe(true);
  });

  test.each([
    ["prod/feat/x", "目标段"], // 目标集外
    ["dev/hotfix/x", "性质段"], // 性质集外
    ["Dev/feat/x", "目标段"], // 大写目标
    ["dev/feat/X", "名称段"], // 大写名称
    ["dev/feat/a_b", "名称段"], // 下划线
    ["dev/feat/a.b", "名称段"], // 点号
    ["dev/feat/-a", "名称段"], // 连字符开头
    ["dev/feat/a-", "名称段"], // 连字符结尾
    ["dev/feat", "三级格式"], // 缺段
    ["dev/feat/", "三级格式"], // 空名称段
    ["dev/feat/x/y", "三级格式"], // 四段
    ["devfeat-x", "三级格式"], // 非斜杠分隔
  ])("非法：%s（%s）", (branch, keyword) => {
    const result = validateBranchName(branch, CONFIG);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain(keyword);
    }
  });

  test("配置派生：目标集/性质集修改后校验自动跟随", () => {
    const custom: WorktreeConfig = { ...CONFIG, targets: ["feature"], kinds: ["bug"] };
    expect(validateBranchName("dev/feat/x", custom).ok).toBe(false);
    expect(validateBranchName("feature/bug/x", custom).ok).toBe(true);
  });
});

describe("resolveBaseBranch / loadWorktreeConfig", () => {
  test("baseMap 映射优先，未映射返回 null（= 当前 HEAD）", () => {
    expect(resolveBaseBranch("dev", CONFIG)).toBe("develop");
    expect(resolveBaseBranch("rel", CONFIG)).toBeNull();
    expect(resolveBaseBranch("ms", CONFIG)).toBeNull();
  });

  test("配置文件缺失回退默认值；字段非法回退对应默认", async () => {
    const missing = await loadWorktreeConfig(join(base, "absent.json"));
    expect(missing.config).toEqual({ targets: ["dev", "rel", "ms"], kinds: ["feat", "fix", "chore"], worktreeDir: "../.ocp-worktrees", baseMap: {} });
    const brokenPath = join(base, "broken.json");
    await writeFile(brokenPath, "{oops");
    const broken = await loadWorktreeConfig(brokenPath);
    expect(broken.warning).toContain("解析失败");
    expect(broken.config.targets).toEqual(["dev", "rel", "ms"]);
  });
});

// ---- CLI 路由（退出码约定：0=成功 / 2=用法错误）----

describe("cli/index 路由", () => {
  test("无参数与 --help → 0；未知命令 → 2", async () => {
    expect(await cliMain([])).toBe(0);
    expect(await cliMain(["--help"])).toBe(0);
    expect(await cliMain(["definitely-not-a-command"])).toBe(2);
  });
});

describe("checkModelRouting 模型路由建议（2026-09-18 用户策略）", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ocp-model-routing-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  async function setup(configs: { global?: unknown; project?: unknown; agents?: Record<string, string> }) {
    const globalPath = join(dir, "global-opencode.json");
    const projectPath = join(dir, "project-opencode.json");
    const agentsDir = join(dir, "agents");
    if (configs.global !== undefined) await writeFile(globalPath, JSON.stringify(configs.global));
    if (configs.project !== undefined) await writeFile(projectPath, JSON.stringify(configs.project));
    if (configs.agents) {
      await mkdir(agentsDir, { recursive: true });
      for (const [name, model] of Object.entries(configs.agents)) {
        await writeFile(join(agentsDir, `${name}.md`), `---\nmodel: ${model}\n---\n正文\n`);
      }
    }
    return { globalPath, projectPath, agentsDir };
  }

  test("checker 与 oracle/builder 同 modelId → WARN（交叉验证弱提示）", async () => {
    const { globalPath, projectPath, agentsDir } = await setup({
      global: { agent: { checker: { model: "gw/glm-5.3" }, oracle: { model: "gw/glm-5.3" }, builder: { model: "gw/glm-5.3-flash" } } },
    });
    const r = await checkModelRouting(globalPath, projectPath, [agentsDir]);
    expect(r.level).toBe("WARN");
    expect(r.message).toContain("oracle=gw/glm-5.3");
    expect(r.message).not.toContain("builder"); // builder 是 flash 不同 modelId，不进冲突清单
  });

  test("checker 跨家族 → PASS", async () => {
    const { globalPath, projectPath, agentsDir } = await setup({
      global: { agent: { checker: { model: "deepseek/deepseek-flash" }, builder: { model: "zhipuai/glm-5.3" } } },
      agents: { oracle: "zhipuai/glm-5.3" },
    });
    const r = await checkModelRouting(globalPath, projectPath, [agentsDir]);
    expect(r.level).toBe("PASS");
    expect(r.message).toContain("交叉验证就绪");
  });

  test("全未配置（同默认模型）→ WARN 且文案区分", async () => {
    const { globalPath, projectPath, agentsDir } = await setup({ agents: {} });
    const r = await checkModelRouting(globalPath, projectPath, [agentsDir]);
    expect(r.level).toBe("WARN");
    expect(r.message).toContain("同用默认模型");
  });
});
