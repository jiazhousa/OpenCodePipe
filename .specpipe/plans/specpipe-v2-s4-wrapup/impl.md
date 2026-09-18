# Impl: SpecPipe v2 Epic 收尾（4a 内容分层清理 + 4c 退役轻收尾）

> 对口 spec：`spec.md`（rev3 终稿，2026-09-18 三轮审查 PASS，用户已放行）。本 Story 全部为文档/配置/注释级改动，无业务逻辑——执行者=调度者串行执行（规模依据：机械替换 + 环境资产操作，无并行需求）。

## 改动点

### 块 A —— 环境层（非 git 资产，调度者直接操作）

| # | 文件 | 改动 |
|---|---|---|
| A1 | `~/.config/opencode/AGENTS.md` | 新建：`~/doc/AGENTS.md` 十二节（用户全局规则）整体迁入，保持原文不改写 |
| A2 | `~/doc/AGENTS.md` | 删除十二节；头部注释补一行分层说明（用户规则已迁全局层） |

### 块 B —— B 仓文档净化（五件，单 commit）

| # | 文件 | 改动 |
|---|---|---|
| B1 | `README.md` | 挂载示例 `file:///home/starlex/...` → `file:///<B仓本地路径>`；其他个人路径占位化 |
| B2 | `docs/BOOTSTRAP.md` | ①模型实值段（glm-5.3/deepseek）→ 通用表述；②GH_TOKEN/TAVILY_API_KEY → "自备凭据"通用指引；③过渡期安装节（v1 skill 恢复路径）→ `ocp init` 路径 |
| B3 | `docs/agents-adoption.md` | 模型实值（example 与"本机实配历史参考"段）→ `<provider>/<model>` 占位；个人路径通用化 |
| B4 | `docs/cli-usage.md` | 实测输出中的 `/home/starlex` → `~/` 或 `<用户目录>` 脱敏 |
| B5 | `AGENTS.md` | `~/doc` 历史路径引用 → 通用表述（"会话工作区"） |

### 块 C —— B 仓代码层中性化（agents 两件 + tests 一件，同 commit 或紧随）

| # | 文件 | 改动 | 验证 |
|---|---|---|---|
| C1 | `agents/oracle.md` | ①frontmatter 占位注释示例 `zhipuai-coding-plan/glm-5.3` → `your-provider/your-model`（**保留「用户决策位」关键词不动**——doctor.ts 占位识别与 agents-permission.test 依赖）；②正文 L63 纯文本举例"如 glm-5.3 等"→"纯文本类模型"；③正文多模态举例"（如 qwen-3.8-max、kimi-k3 等视觉模型）"→"（多模态模型）" | fence 全量 |
| C2 | `agents/looker.md` | 部署前提"（纯文本模型，如 glm-5.3）"/"（如 qwen-3.8-max、kimi-k3 等）"→ 通用表述（不点名型号） | 同上 |
| C3 | `tests/cli-doctor-worktree.test.ts` | 夹具完整映射（6 处值 + 断言同步）：`gw/glm-5.3-flash`→`gw/model-a-mini`、`gw/glm-5.3`→`gw/model-a`、`deepseek/deepseek-flash`→`other/model-b`、`zhipuai/glm-5.3`→`zhipuai/model-c`（L370/371）；**断言 L364 `toContain("oracle=gw/glm-5.3")` 同步改 `oracle=gw/model-a`**；替换顺序**先长后短**（glm-5.3-flash 先于 glm-5.3，防前缀吞噬）；PASS 场景 message 断言"交叉验证就绪"不变 | 同上 |

### 块 D —— 收尾（质量门前）

| # | 动作 | 说明 |
|---|---|---|
| D1 | roadmap 更新 | S4 行 → 4a/4c 达成注记；用户动作清单对应条目更新；4c"全局指引"子项落点注记（=本 Story 块 A，映射见 spec 业务规则 6） |
| D3 | fence 全量四步 | agents/tests 改动为代码路径，必须全绿 |
| D4 | 口径终扫 | spec 验收 #4 字面口径（大小写敏感，4d 备忘）跑一遍零残留留证 |
| D5 | **[DONE 后执行]** 档案终态归档 B 仓 | 质量门 PASS + `.stage=DONE` 后，把 doc 工作区 `.specpipe/plans/specpipe-v2-s4-wrapup/`（含 .stage-history 的 `QUALITY_GATE→DONE` 行）复制至 B 仓同路径——此后 agents/tests 同推时 pre-push 语义闭环（预门归档必为非 DONE 态，反而触发硬拒） |

## 影响范围

- B 仓：8 文件（5 文档 + 2 agents + 1 tests）+ roadmap + 档案归档，单或双 commit（`chore: 内容分层清理`）
- 环境层：全局 AGENTS.md 新建、doc AGENTS.md 瘦身（非 git，即时生效于新会话）
- 不动：A 仓（零残留）、`.specpipe/` 历史档案、bun.lock、代码逻辑

## 验证方式

1. `bun run fence` 四步全绿（C 块后）
2. 口径终扫零残留（D4）
3. 验收 #1/#2（会话注入效果）：机制推理 + 用户侧新会话实跑（本会话无法自验注入，标注为用户验证项）
4. 质量门：Checker 按验收标准 6 条逐项核验

## 风险与回滚

- 全局层新建：删除 `~/.config/opencode/AGENTS.md` 即回滚（十二节在 doc 的 git 历史可恢复）
- doc 瘦身：doc 仓当前工作树 dirty（AGENTS.md 已有未提交改动），A2 改动由用户择机 commit，回滚=git checkout 该文件段
- B 仓：commit revert
