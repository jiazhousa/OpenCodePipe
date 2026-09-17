#!/usr/bin/env bun
// ocp CLI 手写路由（D1）：命令表 + process.argv 解析 + --help，不引 CLI 框架。
// 退出码约定全命令统一：0=成功 / 1=检查失败 / 2=用法错误。
// hook 当前为 stub（块B 交付），路由可达即返回 stub 退出码 2。
import { main as mainCheck } from "./commands/check";
import { main as mainDoctor } from "./commands/doctor";
import { main as mainHook } from "./commands/hook";
import { main as mainInit } from "./commands/init";
import { main as mainWorktree } from "./commands/worktree";

interface Command {
  name: string;
  summary: string;
  main: (args: string[], ctx: { cwd: string }) => Promise<number>;
}

const COMMANDS: Command[] = [
  { name: "init", summary: "铺设工作流目录/模板/fence 模板（--hook 安装 pre-push 薄壳）", main: mainInit },
  { name: "doctor", summary: "环境自检（--json 结构化输出；只报告不安装）", main: mainDoctor },
  { name: "worktree", summary: "创建 git worktree（三级分支名校验 + 专用目录 + 五步指引）", main: mainWorktree },
  { name: "check", summary: "机械检查项路由（whitespace/line-budget/commit-format/transition-consistency/platform-words）", main: mainCheck },
  { name: "hook", summary: "pre-push 校验入口（块B 交付）", main: mainHook },
];

const USAGE = [
  "ocp —— SpecPipe B 仓 CLI 工具族",
  "",
  "用法：ocp <command> [args]",
  "",
  "命令：",
  ...COMMANDS.map((command) => `  ${command.name.padEnd(10)}${command.summary}`),
  "",
  "退出码：0=成功；1=检查失败；2=用法错误",
].join("\n");

/** 路由入口（导出供测试；import 本模块无副作用） */
export async function main(argv: string[]): Promise<number> {
  const [name, ...rest] = argv;
  if (!name || name === "--help" || name === "-h") {
    console.log(USAGE);
    return 0;
  }
  const command = COMMANDS.find((c) => c.name === name);
  if (!command) {
    console.error(`未知命令：${name}`);
    console.error(USAGE);
    return 2;
  }
  return command.main(rest, { cwd: process.cwd() });
}

if (import.meta.main) {
  try {
    process.exit(await main(process.argv.slice(2)));
  } catch (error) {
    console.error(`ocp 内部错误：${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
