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

### Story 3 —— B 仓 CLI 工具族（2026-09-17 DONE，质量门 98/100）

- **四块交付**：块A CLI 骨架（五命令路由 `#!/usr/bin/env bun` + 退出码 0/1/2）/ 块B pre-push hook（hook-core 纯函数 + stdin refs 解析）/ 块C check-tools 四项 + check 路由 / 块D vendored 机制 + 三层一致性
- **pre-push 语义（spec rev2 定稿）**：按 diff 判定——纯档案放行；代码变更 → Story/Issue topic 须 `.stage=DONE`（history 存在则逐行 JSON.parse 核 `QUALITY_GATE→DONE` 行，**双形态容错**；存在缺行=拒；文件缺失=WARN 存量豁免）；**Epic topic 跳过**（epic-spec.md 存在即判定）；无 topic 代码 WARN 放行；fail-open（解析异常放行）。**坑：git 调 pre-push 传 `<remote> <url>` 位置参数**——用法检查须容忍（真机抓出）
- **vendored 消费者责任**：`configs/vendor/specpipe/`（07 卷 + templates 九件，基线 1ecfe8dd9b21004b51b93b58dea7b71d40485ce9）+ transition-table vendor 段（十件 sha256）+ transition-snapshot.json（与 S2 测试常量同构，比较键 edge=from→to|trigger|actor）；`vendor-sync.ts` 判据：**07 哈希变化即"契约已变"非零退出**（人工适配走 Story/Issue）；一致性三层进 fence 第四步（consistency）
- **check 五项**：whitespace / line-budget（**规则表按序首配生效**，epic-spec-revision 排前防通配重叠；impl 类报告不设限）/ commit-format（merge 跳过）/ transition-consistency / platform-words（词表对齐 S1 禁词分类；全仓检查 `--path` 指 A 仓，实测 20 文件零命中）
- **doctor 二级配置**：项目级 `{wf}/doctor-config.json` → 用户级 `~/.config/opencodepipe/doctor.json`；只报告不安装
- **B 仓自举**：`.git/hooks/pre-push` 已装（薄壳三段：ocp 优先/bun 回退/双缺警告 exit 0）；首次真实 push 于 Story 3 收尾
- **glob 转义坑（两 Builder 各自踩中）**：转义字符类 `[.*+?^${}()|[\]\\] 自身含 *`，朴素替换链会把 `**` 拆坏——NUL 占位法 / split 法两解均实证稳健（17 边界 × 3 实现）

## 环境注意事项

- **checker subagent 跨 worktree 落盘**：会话工作区不在 B 仓根时，edit/write 对 B 仓路径的权限匹配存在已知问题（绝对模式 allow 不生效），checker 经 bash python3 通道落盘可行——根治方案 = 从 B 仓根启动会话（roadmap 档案约定）
- opencode 1.18.31 插件加载行为：`isPathPluginSpec` 识别 file:///./绝对路径；全部运行时导出即插件函数；peerDependencies 的 @opentui/* 为 optional（不装也能 typecheck）
