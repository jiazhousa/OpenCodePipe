# Spec: SpecPipe v2 Epic 收尾（4a 内容分层清理 + 4c 退役轻收尾）

## 背景

Epic specpipe-v2-split 的 S4 剩余部件 4a（user-rule 成文）与 4c（旧体系退役收尾）。2026-09-18 用户拍板方向：user-rule 载体 = opencode 原生 AGENTS.md 分层机制（不发明新机制）；本 Story 目标 = 把项目相关、用户个人选择相关的内容从 SpecPipe/OpenCodePipe 层拆出，各归其层。

侦察与审查（spec rev1 被 REJECT 的战果）修正的事实：A 仓零残留属实；B 仓**项目内容**（天枢/OntoZ 等）零残留属实，但**用户个人选择内容存在**——文档层有模型实值（glm-5.3/deepseek 系）、个人绝对路径（/home/starlex、~/doc）、用户环境变量名（GH_TOKEN/TAVILY_API_KEY），分布于：①五件文档（README / BOOTSTRAP / agents-adoption / cli-usage / AGENTS.md——模型实值、个人绝对路径、环境变量名）；②agents 两件（oracle.md frontmatter 占位注释的示例值与正文模型名举例、looker.md 部署前提的模型名举例）；③tests 夹具（cli-doctor-worktree.test.ts 的模型字面值）；④天然不可净化项（bun.lock 哈希值内嵌子串、gitignored 的 test-fence-reports/——均非 git 内容或不可改写，口径排除）。另一核心事实：**全局层从未建立**——十二节用户全局规则错位在 `~/doc/AGENTS.md`（doc 工作区层），非 doc 目录会话零用户规则。

## 业务规则

1. **分层契约**（A 仓 10-composition 组合覆盖的落地形态）：仓规章（A 仓十卷）→ 项目规则（各项目根 AGENTS.md）→ 用户规则（`~/.config/opencode/AGENTS.md` 全局层）；后加载覆盖同名项；"换人依然成立"为入仓测试。
2. 用户规则升格：`~/doc/AGENTS.md` 十二节（用户全局规则）整体迁入新建的 `~/.config/opencode/AGENTS.md`，doc 删除十二节——全局+项目两层注入不重复。
3. 天枢/OntoZ 记忆（一~十一节）留在 `~/doc/AGENTS.md`：doc 即天枢文档工作区，属项目规则层合法位置；doc 头部历史重构注释保留（历史事实，2026-09-18 用户确认）。
4. 十二节中「开发环境」小节的本机路径描述原样保留（用户确认）——属用户环境声明，个人层合法内容。
5. **B 仓净化**（rev2 纳入、rev3 细化处置分类）：用户个人选择内容出仓——
   ①**文档层**：模型实值占位化（`<provider>/<model>` 或中性示例）；个人绝对路径通用化（`file:///<B仓本地路径>`、`<用户目录>`）；环境变量名通用化（指向"自备凭据"）。
   ②**agents 层**：frontmatter 占位注释的示例值中性化（`your-provider/your-model` 形态）；正文与部署前提中的模型名举例改通用表述（"纯文本模型"/"多模态模型"，不点名具体型号）。
   ③**tests 层**：夹具模型名中性化（`gw/model-a`、`other/model-b` 形态，保持测试语义不变）。
   例外（口径排除）：`.specpipe/` 工作流档案（历史事实记录不改写）；`bun.lock`（锁文件哈希不可改写）；gitignored 目录（非 git 内容）。
6. 4c 轻收尾：B 仓 `docs/BOOTSTRAP.md` 过渡期安装节（v1 skill 恢复路径）替换为 `ocp init` 路径；roadmap S4 状态与用户动作清单同步更新；roadmap 注记 Epic 4c"全局 AGENTS.md 指引更新"子项的落点映射（= 本 Story 业务规则 2 的全局层建立，全局层内容为用户规则不含工作流指引——工作流指引归 agents 定义与 A 仓规章，4d 终检时按此口径核验）。
7. 本 Story 的 B 仓改动以文档层为主，含 agents 占位注释与 tests 夹具的中性化（轻微代码层，fence 验证覆盖）；档案流：`.stage` 流水产生于本会话工作区（插件 wfRoot 锚 cwd 的已知行为），Story 收尾时档案终态复制归档至 B 仓 `.specpipe/plans/specpipe-v2-s4-wrapup/`（含 .stage-history，保证 pre-push 语义闭环）。

## 验收标准

1. 任意非 doc 目录新开会话，用户规则可见于上下文（中文输出/git 纪律/禁 root 库等十二节内容生效）
2. `~/doc` 会话仍注入天枢记忆（一~十一节）且不重复注入十二节
3. B 仓 BOOTSTRAP.md 无 v1 skill 恢复路径的过渡期内容，安装路径为 `ocp init`
4. B 仓零残留，扫描口径钉死：`git ls-files` 范围内，排除 `.specpipe/`、`bun.lock`、`node_modules`；模式=项目词（tianshu|天枢|ontoz|zoe|qianxing）+ 用户选择词（glm-|deepseek|/home/starlex|~/doc|GH_TOKEN|TAVILY）；A 仓维持零残留（同项目词口径）
5. roadmap S4 行更新为 4a/4c 达成，4d（Epic 终检）可启动
6. B 仓 fence 四步全绿（文档改动不破坏工程）

## 范围

**做**：全局层建立与十二节升格；doc 记忆瘦身；B 仓文档净化（README/BOOTSTRAP/agents-adoption/cli-usage/AGENTS.md 五件）；BOOTSTRAP 过渡期节替换；roadmap 更新；档案终态归档 B 仓。

**不做**：天枢 worktree 各仓 AGENTS.md 治理（天枢项目自己的事）；A 仓内容清理（零残留）；环境值集中声明机制（用户裁决不升级）；S5 相关（另行立项）；`.specpipe/` 工作流档案的事实记录改写。

## 关键风险

- **全局层新建后注入面扩大**：所有会话（含公司项目）都将携带用户规则——十二节含本机环境描述，共享环境使用需自行裁剪（个人环境边界，风险自担）
- **文档净化过度**：占位化可能损及 example 的教学直观性——以 `<provider>/<model>` 等自说明占位形态保持可读
- **档案分居的时序**：本会话 .stage 在 doc 工作区；B 仓 pre-push 对纯文档改动走全档案静默放行，agents/tests 等代码路径同推时走 topic 校验（Story 未 DONE 会被拒）——收尾归档后闭环
