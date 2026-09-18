# Issue: ocp 短命令 wrapper 化与 bun 前置显式化（ocp-link-cli）

## 背景

- 第二台机器部署（2026-09-18）发现：`cli/index.ts` shebang `#!/usr/bin/env bun` 要求 **PATH 中有全局 bun**；该机无全局 bun（仅各项目 devDep 内有），裸 `ln -s` symlink 后 ocp 无法执行，绕法为借用 B 仓 `node_modules/.bin/bun` 的二级 symlink——B 仓依赖重装即断链
- BOOTSTRAP.md 前置清单（git/opencode/tmux）未提 bun，文档缺口
- 完整问题记录：第二台机器 `workbench/ocp-migration-issues-20260918.md` 问题 #2

## 设计决策

- **交付 `scripts/link-cli.sh`**：生成 wrapper 脚本（默认目标 `~/.local/bin/ocp`），wrapper 内固定 `exec <B仓>/node_modules/.bin/bun <B仓>/cli/index.ts "$@"`——将第二台机器的绕法转正为机制
- 前置从「全局 bun」降为「**本仓已 bun install**」（devDep 自带 bun 即可）；获取 bun 首次的途径任选（官方安装器 / `npm i -g bun` / 借用任一项目 devDep 二进制）
- B 仓整体移位是 wrapper 唯一脆弱点，重跑脚本即恢复；README/BOOTSTRAP 注明

## 动作

1. 新增 `scripts/link-cli.sh`（检查 devDep bun 存在 → 生成 wrapper → chmod +x）
2. `README.md` 快速开始③：`ln -s` 改为 `bash scripts/link-cli.sh`，注明 wrapper 机制与前置
3. `docs/BOOTSTRAP.md`：前置清单补 bun 获取途径；③ 同步改 wrapper 形态
4. `docs/cli-usage.md` 安装行同步

## 验证

- 第二台机器实测：跑 `scripts/link-cli.sh` 重生成 `~/.local/bin/ocp` → `ocp --help` / `ocp doctor` 正常（本次部署即真实验收环境）
- `ocp check whitespace` + `commit-format`

## 影响面

- 新增一个脚本 + 三处文档行；不动 cli/plugin/tests
