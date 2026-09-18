# 审查报告: specpipe-v2-s4-wrapup (Revision 1)

## 总体评价

不通过。块 B（五件文档）与块 A（环境层）的覆盖与事实前提经实测成立，D3 fence 时序成立；但 C 块存在两处必改缺陷——tests 漏 2 处 `zhipuai/glm-5.3`（验收 #4 字面口径零残留不可达）与「断言不变」表述同 L364 断言必须同步替换的事实矛盾（按字面执行 fence 必红）；D2 归档置于「质量门前」与其自身声明的 pre-push 闭环目标矛盾（归档需 DONE 终态）。另有 1 medium + 3 low。修正后可再递交。

## 逐项核验（按任务书 5 检查项）

### 1. 完备性：块 B 覆盖完备，C 块 tests 漏 2 处

代理实测（B 仓 `git ls-files` 排除 `.specpipe/`、`bun.lock`、`node_modules`，大小写敏感——与验收 #4 字面口径一致）：

- **五件文档合计 23 处**（其中 docs/ 三件 21 处 + README/AGENTS 各 1 处）：
  - README.md L16（×1）→ B1 ✓
  - docs/BOOTSTRAP.md L34/42×3/44/45/46/52×2（9 处）→ B2 ①②③ 逐项覆盖 ✓
  - docs/agents-adoption.md L14/24/54/69×2/75×3/112（9 处）→ B3「模型实值 + 个人路径」覆盖 ✓
  - docs/cli-usage.md L34/37/38（3 处）→ B4 ✓
  - AGENTS.md L35（×1）→ B5 ✓
- **agents 两件 3 处**：oracle.md L4/L64、looker.md L15 → C1/C2 覆盖 ✓（oracle L63 另见发现 4）
- **tests 一件 8 处（4 行）**：L360×3、L364、L370×3、L371 → C3 三映射仅覆盖 6 处；**`zhipuai/glm-5.3` 2 处（L370/L371）无映射 → 漏点**（详见发现 1）
- 范围外复核：A 仓项目词零命中；cli/check-tools/src/scripts/configs/plugin 及根文件对词表零命中（与 rev3 报告一致）

### 2. 正确性：占位形态恰当；C3 断言与替换顺序需修

- 占位形态（`file:///<B仓本地路径>`、`<provider>/<model>`、`your-provider/your-model`、`gw/model-a` / `gw/model-a-mini` / `other/model-b`）自说明，不损 example 教学性 ✓
- L364 断言 `expect(r.message).toContain("oracle=gw/glm-5.3")` 引用夹具字面值——夹具改名必须同步改断言（发现 2）
- 前缀重叠：`gw/glm-5.3` 是 `gw/glm-5.3-flash` 的前缀，替换顺序需先长后短（发现 2）
- C1 替换须保留「用户决策位」标注（发现 5）
- 测试语义复核（对照 `cli/commands/doctor.ts` L284-326 `checkModelRouting`）：test 1 依赖 checker==oracle 且 builder 不同 modelId、test 2 依赖 checker 与 oracle/builder 不同 modelId——按建议重命名后两用例语义均仍可达 ✓

### 3. 时序：D3 成立；D2 矛盾

- D3 fence 在 C 块后 ✓：fence 四步 = typecheck/test/smoke/consistency（`scripts/run-test-fence.ts` L18-24）；C 是唯一代码路径改动，B/D 改动不影响 fence
- D1/D4 无时序问题 ✓
- **D2 ✗**：块 D 标注「质量门前」，但归档（.stage + .stage-history）只有质量门 DONE 后才是终态；pre-push hook（`cli/commands/hook-core.ts` L148-168）要求代码路径推送时 topic `.stage=DONE` 且 history 含 `QUALITY_GATE→DONE` 行——预门归档携带 IMPL_APPROVED/WORKING，闭环不可达（发现 3）

### 4. 验证方式可达性：验收 #1/#2 用户侧实跑为唯一端到端解（结论：可接受）

- 本审已做文件级代理核验：`~/.config/opencode/AGENTS.md` 当前不存在（A1「新建」属实）；全局 opencode.json `instructions: []`（无额外挂载、无重复注入源）；doc AGENTS.md 十二节边界 L592-603 属实（文件共 603 行）
- 注入是宿主运行时行为，本地无法自验——用户侧新会话实跑确为唯一端到端验证，impl 标注恰当 ✓
- 验收 #4：D4 扫描口径（字面/大小写敏感）与 rev3 报告一致 ✓（补 C3 漏点后可达）
- 验收 #3/#5/#6：文件级/命令级可达 ✓

### 5. 执行者安排：成立（酌情范围）

- 8 文件 + roadmap + 归档超出「≤3 文件」常规阈值，但 oracle 职责 5 为「可酌情」授权空间：全部机械替换 + 环境资产操作（`~/.config`、`~/doc` 非 worktree），无并行收益；验证有 fence/D4/质量门三层兜底——安排成立
- 注意：环境层操作无自动化回滚（发现 6），执行时建议留底

## 发现的问题

1. **C3 未覆盖 `zhipuai/glm-5.3`（tests L370/L371）** — 严重程度：high
   - 影响：验收 #4 字面扫描（`glm-` 模式）在 `tests/cli-doctor-worktree.test.ts` 残留 2 处命中，零残留不达成；D4 终扫会红
   - 建议：补一条映射（如 `zhipuai/glm-5.3` → `zhipuai/model-c`），保持 test 2「跨家族 PASS」语义（只需与 `other/model-b` 不同前缀）

2. **C3「（测试语义与断言不变）」表述错误/歧义；替换顺序未说明** — 严重程度：high
   - 影响：L364 断言引用夹具字面值——按「断言不变」只改夹具行则测试必红（验收 #6 fence 失败）；若做全文字面替换，须明确「断言同步替换」而非「不变」。另 `gw/glm-5.3` 为 `gw/glm-5.3-flash` 前缀，先短后长替换会把 flash 变体改坏（变 `gw/model-a-flash`，不红测试但偏离声明形态）
   - 建议：改为「三处字面量全文替换（含 L364 断言同步改为新值）；先替换 `gw/glm-5.3-flash` 再替换 `gw/glm-5.3`，避免前缀吞并」；或直接给全文件替换清单

3. **D2 归档时序与 pre-push 闭环目标矛盾** — 严重程度：high
   - 影响：块 D 标注「质量门前」，此时 doc `.stage` 非 DONE（IMPL_APPROVED/WORKING）；质量门 PASS 后 DONE 与 `QUALITY_GATE→DONE` 留痕写回 doc 工作区，B 仓档案不会自动刷新。最终推送含 agents/tests（代码路径）+ 档案 → hook 读 B 仓工作树 `.stage`（非 DONE）→ 硬拒「未完成质量门」；若档案不随推则「档案终态归档」承诺落空
   - 建议：D2 移至质量门 DONE 后执行（或将「DONE 后终态刷新归档」作为独立收尾步），块 D 标题同步修正

4. **C1 未覆盖 oracle.md L63 多模态模型举例** — 严重程度：medium
   - 影响：spec 规则 5-② 要求 agents 正文模型名举例「不点名具体型号」；C2 已对 looker.md 同款双举例（含 qwen-3.8-max、kimi-k3）通用化，C1 只列 L64 的 glm 半句——L63「（如 qwen-3.8-max、kimi-k3 等视觉模型）」将保留，同一规则两处执行不一致；D4 字面扫描不覆盖这两词，不会自曝
   - 建议：C1 标注「正文 L63/L64 两组模型举例一并改通用表述（多模态模型 / 纯文本类模型）」

5. **C1 替换须保留「用户决策位」标注** — 严重程度：low
   - 影响：`tests/agents-permission.test.ts` L120-128 守护断言 `fm.model` 含「用户决策位」，`doctor.ts` L277/L300 以该标注识别占位（不保留会被当作已配置实值）——若替换时把标注一并改掉则 fence 红 + doctor 误判
   - 建议：C1 明确「仅替换示例值部分，`<provider/model——用户决策位，示例：…>` 结构保留」

6. **环境层回滚表述与实际不符（doc 为 git 仓且工作树 dirty）** — 严重程度：low
   - 影响：「影响范围」称 doc 瘦身为「非 git」，与 doc 是 git 仓、AGENTS.md 有提交历史且**当前工作树已有未提交改动**不符；「风险与回滚」写「git revert 即回滚」在未提交场景不适用，按 `git checkout -- AGENTS.md` 操作会连带丢弃既有未提交内容
   - 建议：表述改为「不进 B 仓提交」；回滚指引写明「改动前备份/`git diff` 留底；回滚前确认工作树既有改动已保全」

7. **D1「用户动作清单勾项」指向不明** — 严重程度：low
   - 影响：roadmap 现有清单（L79-86）无 4a/4c 对应未勾项；「勾项」指新增还是更新哪一条不明，4d 对账口径可能不一
   - 建议：D1 写明具体动作（如新增并勾选「v1 skill 退役归档确认」项，或明确不涉及清单改动）

## 结论

# REJECT
状态：IMPL_REVIEWING → IMPL_DRAFT
