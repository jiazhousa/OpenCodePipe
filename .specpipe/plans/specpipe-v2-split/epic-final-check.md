# Epic 终检报告：specpipe-v2-split

**执行**：调度者（2026-09-18）｜**依据**：A 仓 04-epic-path「Epic 终检」三校验 + epic-spec.md 验收标准 6 项

## 三校验（04 卷）

1. **每个 Story `.stage` 均为 DONE** ✅ —— s1-rules / s2-core / s3-cli / s4-wrapup 四 topic 终态 DONE
   - ⚠️ **诚实回补说明**：S1/S2 无过程流水、S3 缺 history——S1 时期状态机插件未交付（插件本身是 S2 交付物）、S2 开发期插件在途，属 v1→v2 演化的真实历史痕迹；本次按质量门报告 + git 历史回补**终态单行**（note 字段注明回补性质），不造过程流水。S4 全程 13 条流水完整（新体系自证）
2. **epic-spec 所有 Story 标记 ✅** ✅ —— 本次补标 S2/S3/S4（S1 先例已有）
3. **无未完成 Story** ✅ —— S4 以 4 部件判定：4a ✅ 4c ✅（specpipe-v2-s4-wrapup DONE，质量门 98/100）；4b ✅（真实需求实跑，12 条流水 + 6 MR，载体由候选 CRM demo 调整为天枢真实需求——前置决策项由用户实际选择）；4d = 本终检

## 验收标准 6 项

| # | 标准 | 结果 | 证据 |
|---|---|---|---|
| 1 | 四 Story 全部 DONE（各自质量门 PASS） | ✅ | 质量门报告 ×4：92/100（S1）/ 94/100（S2）/ 98/100（S3）/ 98/100（S4） |
| 2 | 集成验收：history 留痕 + 质量门记录 + pre-push 拦截与放行各一次 | ✅ | 拦截：S3 hooktest-record.md；放行：s4-wrapup push 静默通过（agents/tests 代码路径 + topic DONE + history 质量门行全链执法）；流水：4b 12 条 + s4-wrapup 13 条 |
| 3 | 转移表一致性（A 仓 07 与 B 仓数据 diff 为空） | ✅ | `ocp check transition-consistency` 三层 PASS（哈希/schema/快照，终检实跑） |
| 4 | 旧 skill 退役 + 全局 AGENTS.md 更新 | ✅* | 退役：skills-archive-20260917 + BOOTSTRAP 安装节替换 ocp init；**落点演化说明**：spec 设想的「全局 AGENTS.md=新体系指引」实际落位三层——全局层=用户规则十二节（第 6 条含新载体锚点，4a 用户拍板：user-rule 走原生分层、工作流指引不入全局层）、安装指引=B 仓 BOOTSTRAP/agents-adoption、doc 第六节载体切换声明 |
| 5 | plugin/agents/cli/check-tools 单测全绿 + fence | ✅ | fence 四步全绿（fence-mJmp1g：typecheck/test 130 用例/smoke/consistency，终检复跑快验一致） |
| 6 | A 仓平台无关性（词扫零命中） | ✅ | `ocp check platform-words --path ~/project/specpipe` 20 文件零命中（终检实跑） |

## 里程碑

- **M1 规章冻结** ✅（S1 用户放行）→ **M2 强制层就绪** ✅（S2+S3 质量门）→ **M3 切换完成** ✅（本终检）→ **Epic ALL_DONE**
