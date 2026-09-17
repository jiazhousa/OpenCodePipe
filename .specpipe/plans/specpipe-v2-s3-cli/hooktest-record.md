# Story 3 验收 5 手验记录（2026-09-17）

宿主：git + bun（`/tmp/opencode/hooktest/` 本地 bare 仓构造：work 仓 + bare remote + 薄壳 hook）
被测：`cli/commands/hook.ts` + `hook-core.ts`（经 `.git/hooks/pre-push` 薄壳真机链路）

## 真机四情形（超出 spec 三情形，补 ③b）

| # | 情形 | 结果 |
|---|---|---|
| 1 | 代码变更 + Story topic `.stage=WORKING` | **拦截** ✅ `拒绝：topic「demo-story」未完成质量门（.stage=WORKING，须 DONE）——完成质量门后重推，或 git push --no-verify 跳过校验` |
| 2 | `.stage=DONE` + history 含 `QUALITY_GATE→DONE` 行（**空格形态与紧凑形态混排**） | **放行** ✅ |
| 3 | Epic topic 档案（`epic-spec.md` 存在，`.stage=EPIC_SPEC_APPROVED`）+ 代码混合 | **放行** ✅（Epic 判定命中跳过） |
| 3b | `.stage=DONE` 但 history 无质量门行 | **拦截** ✅ `状态与留痕矛盾：.stage=DONE 但 .stage-history 无 QUALITY_GATE→DONE 行` |

基线链路：纯档案 push 放行 ✅；根 commit 无 `~1` 的 fail-open WARN 放行（设计内奇异形态兜底）✅。

## 真机抓出并修复的 bug

git 调用 pre-push 约定会传 `<remote> <url>` 两个位置参数——hook.ts 原用法检查 `args.length > 1` 误判为用法错误（exit 2），首次真机测试即暴露。修复：接受至多 3 个参数（pre-push + remote + url），多余才报用法错误。**教训：hook 的参数契约必须以 git 真实调用形态为准，d.ts/自测覆盖不到。**

## 结论

验收 5 **通过**：拦截与放行语义均按 spec 规则 1 rev2 语义工作；B 仓自身已自举安装 hook（`.git/hooks/pre-push` 薄壳，2026-09-17）。原会话记录见 Oracle 对话（15:0x-15:2x）。
