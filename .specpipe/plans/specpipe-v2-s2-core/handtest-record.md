# Story 2 验收 3 手验记录（2026-09-17）

宿主：opencode 1.18.31（非交互 `opencode run`，模型 glm-5.3）
挂载方式：D9 主方案——全局 `~/.config/opencode/opencode.json` 的 `plugin` 数组挂 `file:///home/starlex/project/opencodepipe/src/plugin/index.ts`（**实证可行**，无需回退方案）
测试目录：`/tmp/opencode/ocp-handtest`（`.specpipe/plans/demo-topic/`）

## 三情形结果

| # | 情形 | 调用 | 结果 |
|---|---|---|---|
| 1 | 建档 | stage_set(demo-topic, SPEC_DRAFT, 调度者) | `已转移：∅(未建档) → SPEC_DRAFT` ✅ |
| 2 | 合法推进 | stage_set(demo-topic, SPEC_REVIEWING, 调度者) | `已转移：SPEC_DRAFT → SPEC_REVIEWING` ✅ |
| 3 | 非法转移拒绝 | stage_set(demo-topic, DONE, 调度者) | `错误：非法转移：SPEC_REVIEWING → DONE` + `当前状态合法后继：SPEC_USER_AUDIT、SPEC_DRAFT` ✅（含合法后继提示） |

**原子性实证**：非法转移（情形 3）后状态保持 SPEC_REVIEWING 未变，后续合法转移（SPEC_REVIEWING→SPEC_USER_AUDIT）正常通过——失败零写入。

## stage_get 复验

`stage_get(demo-topic)` → `stage：SPEC_USER_AUDIT`（与最后一次成功转移一致）✅

## .stage / .stage-history 落盘实况

`.stage`：单行 `SPEC_USER_AUDIT`

`.stage-history`（JSONL 三行，逐字段符合 07 契约——ts ISO8601 本地时区偏移 / topic / from（建档为 null）/ to / actor）：

```jsonl
{"ts":"2026-09-17T14:35:01+08:00","topic":"demo-topic","from":null,"to":"SPEC_DRAFT","actor":"调度者"}
{"ts":"2026-09-17T14:35:34+08:00","topic":"demo-topic","from":"SPEC_DRAFT","to":"SPEC_REVIEWING","actor":"调度者"}
{"ts":"2026-09-17T14:35:45+08:00","topic":"demo-topic","from":"SPEC_REVIEWING","to":"SPEC_USER_AUDIT","actor":"调度者"}
```

## 结论

验收 3 **通过**：get/set/非法拒绝三情形各验证一次，D9 主方案（file:// URL）实证可行，留痕格式与契约一致。原会话记录见 Oracle 对话（2026-09-17 14:34-14:36）。
