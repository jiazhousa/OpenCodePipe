# Issue: 台账首批清偿——L4 hook 零漂移 + L5 doctor 复用 ① 层（ledger-first-batch）

## 背景

用户指令（2026-09-18）：台账问题必须解决。本 Issue 收首批两项 B 仓侧动作（L3 本机配置部分不涉 B 仓代码，另行处理）。

## L4：本机 hook 安装（零漂移形态）

- 现状：本机 B 仓为 GitHub 克隆，hooks 不随克隆——`.git/hooks/pre-push` 不存在（台账所记"手工变体"在开发机）
- 不跑 `ocp init --hook`：init ①-⑤ 步会向 B 仓铺 doctor-config/fence.sh/templates/gitignore 条目，与 B 仓自有 fence 体系（scripts/run-test-fence.ts）形成双轨
- 动作：直接调用 `cli/commands/init.ts` 导出的 `hookTemplate()` 生成 `.git/hooks/pre-push`（幂等覆盖 + chmod 755）——与模板零漂移，即 L4 精神
- 台账注记：克隆机装生成物即无差异问题；开发机手工变体待开发机侧下次接触时重装

## L5：doctor vendored 检查复用 transition-consistency ① 层

- 现状：`cli/commands/doctor.ts` checkVendored 自实现哈希循环（读表→逐件 sha256→比对），与 `check-tools/transition-consistency.ts` 私有函数 `checkVendorHashes` 语义重叠
- 动作：
  1. `checkVendorHashes` 导出（transition-consistency.ts）
  2. doctor.checkVendored 删自有循环改调它，ConsistencyItem 适配 CheckResult
- 语义保留（doctor 特有）：未铺设/未基线/解析失败 = WARN；哈希不匹配 = FAIL；localARepoPath 附注；commit 显示
- 行为变化说明：① 层比 doctor 原实现**多查**"声明键集与十件清单恰一致"（多余声明/声明缺失）——纳入 doctor 是增强而非回归

## 验证

- `tsc --noEmit` + `bun test` 全过
- `ocp doctor`（vendored 项仍 PASS 10 件）+ `ocp check transition-consistency`
- `ocp check whitespace` + `commit-format`

## 影响面

- 代码：doctor.ts（-~15 行重构）、transition-consistency.ts（+1 export）；hook 生成物不入库（.git/ 天然排除）
- 台账：L3/L4/L5 三行状态更新（随本 commit）
