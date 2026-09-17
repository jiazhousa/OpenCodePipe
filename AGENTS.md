# OpenCodePipe 项目记忆（AGENTS.md）

> 项目层记忆：关键 feature 记录与开发约定。工作流档案权威位置 `.specpipe/`（Epic specpipe-v2-split）。

## 开发模式

- **直接 main 迭代**（用户 2026-09-17 拍板）：不建分支不走 PR；10-composition 的分支策略面向使用方项目
- 质量保障：`bun run fence`（typecheck → test → smoke 三步，报告落 `test-fence-reports/`）
- 依赖版本策略：`@opencode-ai/plugin 1.18.*`（锁 major.minor，patch 浮动）+ bun.lock 固化 + fence smoke 兜底；兼容性承诺仅 V1 宿主 1.18.x

## 已交付（按 Story）

### Story 2 —— B 仓核心（2026-09-17 DONE，质量门 94/100）

- **工程骨架**：单包 `opencodepipe`，bun + TS（strict / resolveJsonModule / types:["bun"]），devDeps 四件套（plugin/typescript/@types/bun/bun）+ deps zod（4.1.*）；`cli/` `check-tools/` 为 S3 槽位占位
- **转移表数据文件** `configs/transition-table.json`：A 仓 07 契约机读形态——18 唯一状态（含 shared 标记的 3 共享态）+ 25 边（**OVERTURN 四类分列**）+ 3 建档边（from=null）+ history JSONL 契约段 + notes（阻塞/重分级/升级清理不进表）；`source` 记 A 仓 commit；等价对照底稿 `plans/specpipe-v2-s2-core/equivalence-check.md`
- **stage 插件**：`src/plugin/index.ts` 入口**仅导出 `ocpStagePlugin`**（宿主 loader 把全部运行时导出当插件函数——约束！）；`stage_get`/`stage_set` 原子语义（校验失败零写入——含目录副作用归零，ensure 参数控制 mkdir 时机）；非法转移报错含去重合法后继；topic kebab-case 校验防逃逸；wfRoot 从插件第二参 options 取（`file://` 挂载 + `["路径", {wfRoot}]` 元组覆盖）
- **本地分发实证**：全局 opencode.json `"plugin": ["file:///…/src/plugin/index.ts"]` 可行（宿主 1.18.31 实测）；`~` 形态不识别（会被当 npm 包名）；npm 分发（S4）需调整 exports 键（`./server`/`main` 才被 loader 消费）+ zod 已转直接依赖
- **agents 五角色**：`agents/` 自 v1 迁移（保真 diff 验证，差异仅 D10 五点适配）；oracle 模型占位（用户决策位）；checker 白名单 `**` 通配 + 绝对路径条目示例值声明；**QUALITY_GATE→DONE actor=调度者**（07 卷分工段为准，checker.md 已加注）
- **QUALITY_GATE→DONE actor 裁决依据**：A 仓 07 卷 L39 分工段 vs L49 转移表双源不一致，取分工段（终检双 PASS 汇合归调度者）
- **测试纪律**：期望边集硬编码自四卷推导（自证免疫，绝不从数据文件生成）；mkdtemp 注入不触碰真实 .specpipe/；负向自验（破坏白名单验证测试有抓漂移能力）

## 环境注意事项

- **checker subagent 跨 worktree 落盘**：本机会话工作区 ~/doc，edit/write 对 B 仓路径的权限匹配存在已知问题（绝对模式 allow 不生效），checker 经 bash python3 通道落盘可行——根治方案 = 从 B 仓根启动会话（roadmap 档案约定）
- opencode 1.18.31 插件加载行为：`isPathPluginSpec` 识别 file:///./绝对路径；全部运行时导出即插件函数；peerDependencies 的 @opentui/* 为 optional（不装也能 typecheck）
