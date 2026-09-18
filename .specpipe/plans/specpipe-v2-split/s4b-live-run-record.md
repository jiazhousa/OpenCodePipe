# S4b 集成实跑验收实录（2026-09-18，真实需求）

> Epic 验收标准 2 的实证：新体系（A 仓规章 + B 仓插件/agents/CLI）在真实开发任务上完整走通。
> 载体为自然发生的生产需求，非构造性演示——含金量高于原计划的人工实跑。

## 任务

**商机分配页列表增加联系人/联系方式列**（天枢 CRM，前后端）——用户初判 Issue 级，S1 访谈后升级 Story 级（规则 13 分级重调整的实践）。

- Session：`ses_f4d9a6877ffe`（~/project/tianshu-backend 启动，零 skill、零项目记忆依赖）
- 档案：天枢 worktree `.specpipe/plans/opportunity-dispatch-contact/`
- 产出：spec 49 行（含验收标准节）+ impl 112 行 + 审查报告 4 份（spec/impl/质量门 rev1-rev2）
- 发布：三环境 6 MR（dev/rel/ms，ms 标 Draft），中文 commit，AGENTS.md 补记录

## 五检查点验收

| 检查点 | 实况 | 判定 |
|---|---|---|
| stage 插件留痕 | 12 条 JSONL 完整流水（含质量门 REJECT→WORKING 回退行；QUALITY_GATE→DONE 行真实存在——pre-push 语义闭环自洽） | ✅ |
| 档案落点 | 项目仓 `.specpipe/plans/{topic}/`，规格齐全 | ✅ |
| Plan 纪律 | spec/impl 逐阶段审查；SPEC_USER_AUDIT 用户放行点真实阻塞 | ✅ |
| 编码载体 | 双 worktree + 三级分支名合规（dev/feat/opportunity-dispatch-contact） | ✅ |
| 收尾发布 | fence（自修天枢 -am reactor 坑）+ 三环境 MR 流 | ✅ |

## 实战战果

- **质量门拦截真实缺陷**：checker 抓出"同客户多行 KP 掩码绕过"（`computeIfAbsent` 共享列表），派 Builder 修复（`fix` commit 独立成条）后复审 PASS
- **Issue→Story 升级路径**首次实践
- 全程 51 分钟（11:12 建档 → 12:03 DONE），564 消息 / 157 工具调用

## 已知环境项复现（非新问题）

1. checker 跨 worktree 写权限受限——审查报告经调度者代为落盘（roadmap L3 台账项，根治=从项目根启动会话）
2. 天枢 worktree 未装 pre-push hook——opt-in 设计内（`ocp init --hook` 可选装）

## 结论

**S4b 实证达成**。S4 剩余：4a user-rule 成文 / 4c 旧体系退役收尾（skill 移出与 agents 接管已于 2026-09-17 完成，剩全局记忆指引整理）/ 4d Epic 终检。
