# OpenCodePipe 项目记忆（AGENTS.md）

> 项目层记忆：关键 feature 记录与开发约定。工作流档案权威位置 `.specpipe/`（Epic specpipe-v2-split）。

## 开发模式

- **直接 main 迭代**（用户 2026-09-17 拍板）：不建分支不走 PR；10-composition 的分支策略面向使用方项目
- 质量保障：`bun run fence`（typecheck → test → smoke → consistency 四步，报告落 `test-fence-reports/`）
- 依赖版本策略：`@opencode-ai/plugin 1.18.*`（V1 类型线）+ `@opencode/plugin 2.0.*`（V2 类型线，仅类型零运行时依赖）+ bun.lock 固化 + fence smoke 兜底；兼容性承诺 V1 宿主 1.18.x（≥1.18.29）与 V2 宿主 2.x（双形状入口，2026-09-20 实证：plans/ocp-plugin-dual-compat）

## 已交付（按 Story）

### Story 2 —— B 仓核心（2026-09-17 DONE，质量门 94/100）

- **工程骨架**：单包 `opencodepipe`，bun + TS（strict / resolveJsonModule / types:["bun"]），devDeps 四件套（plugin/typescript/@types/bun/bun）+ deps zod（4.1.*）；`cli/` `check-tools/` 为 S3 槽位占位
- **转移表数据文件** `configs/transition-table.json`：A 仓 07 契约机读形态——18 唯一状态（含 shared 标记的 3 共享态）+ 25 边（**OVERTURN 四类分列**）+ 3 建档边（from=null）+ history JSONL 契约段 + notes（阻塞/重分级/升级清理不进表）；`source` 记 A 仓 commit；等价对照底稿 `plans/specpipe-v2-s2-core/equivalence-check.md`
- **stage 插件**：`src/plugin/index.ts` 入口**仅 default export 双形状对象 `{id, setup, server}`**（宿主 V1 loader 把 named 运行时导出当插件函数——约束：禁止 named 运行时导出；V1 调 server()/V2 调 setup()，2026-09-20 双形状改造）；`stage_get`/`stage_set` 原子语义（校验失败零写入——含目录副作用归零，ensure 参数控制 mkdir 时机）；非法转移报错含去重合法后继；topic kebab-case 校验防逃逸；wfRoot 从插件第二参 options 取（`file://` 挂载 + `["路径", {wfRoot}]` 元组覆盖）
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

### Story 4a/4c —— 内容分层清理（2026-09-18 DONE，质量门 98/100）

- **全局层建立**：`~/.config/opencode/AGENTS.md`（原 `~/doc/AGENTS.md` 十二节用户规则升格，doc 瘦身为纯天枢项目记忆）；**全局层此前不存在**——用户规则被困 doc 层，非 doc 会话零用户规则
- **B 仓净化**：口径钉死（`git ls-files` 排除 `.specpipe/`/`bun.lock`，项目词+用户选择词双模式，大小写敏感）——五件文档占位化、agents 模型举例中性化（**保留「用户决策位」关键词**——doctor 占位识别与 agents-permission 测试依赖）、tests 夹具中性化（断言同步+先长后短防前缀吞噬）
- **BOOTSTRAP** 过渡期安装节（v1 skill 恢复）→ `ocp init` 路径
- **审查链 5 轮**（spec REJECT/REJECT/PASS + impl REJECT/PASS）：checker 实跑口径扫描验证"净化后零残留机械可达"；抓出 impl 的归档时序死锁（预门归档必非 DONE → 反触发 pre-push 硬拒——D5 修正为 DONE 后归档）
- **自举趣事**：line-budget 对本 Story 自己的 spec 审查报告执法（43 行 > 30 上限）——压缩至 27 行（点位清单复述改引用 spec）
- **档案分居模式**：会话 cwd≠B 仓根时插件 wfRoot 锚 cwd（.stage 在 doc 工作区）——DONE 后归档 B 仓闭环（pre-push 校验 B 仓 repoRoot 下档案）

### Issue stage-file-guard —— stage 状态名合法性校验补强（2026-09-21 DONE，质量门 96/100）

- **背景**：~/doc/SpecIssue.md SI-001——`.stage` 被 shell 直写非法状态名 `I-S3`（阶段编号误作状态常量）致推进被拒；调查证实建档边本就内建（转移表 3 条 `from: null`）但工具描述未披露，且查询通道对直写产物零设防、报错笼统归为「非法转移」误导排障
- **改动**（commit `d1b2389`）：`table.ts` 新增 `isKnownState`/`initialStateNames`；`stage-ops.ts` 新增 `STAGE_INVALID` 错误码（get 识别直写产物 / set 前置校验非法 from·to，message 附实际值与修复指引，清单内嵌不占 legalSuccessors 防「合法后继」措辞错位）；`index.ts` SET 描述消费 `initialStateNames()` 显性化建档语义（单源）；oracle.md（B 仓源+部署位）工具表新增 stage 行、铁律新增「`.stage` 一律经 stage_set」第 7 条
- **教训**：errorOutput 的 legalSuccessors 固定措辞是「当前状态合法后继」——错误提示若传异构清单（建档目标等）须内嵌 message 而非复用该字段；质量门 2 low（描述字面量双源/终态后继空悬）已 amend 修复；fence 四步全绿（commit `d1b2389` 终态）

### Issue ocp-plugin-dual-compat —— OpenCode V2 插件兼容（2026-09-20 DONE，质量门 98/100）
- **背景**：OpenCode V2 发布（2.0.10 beta，npm `@opencode/cli-*` 渠道），插件 API 全面重写（官方 breaking：V1 实现不在 V2 运行）；用户要求双兼容 1.18.x+2.x（不可则优先 2.x）——实证后双兼容成立
- **插件双形状**：`src/plugin/index.ts` default export `{id, setup, server}`（V1 调 server()/V2 调 setup()，手写形状零运行时依赖 `@opencode/plugin`——1.18 宿主无此包；**禁止 named 运行时导出**约束延续）；setup 形态防御（1.18.31 误调传非 V2 ctx 静默跳过）；stage-ops 核心零改动；V2 目录锚 `ctx.location.directory`（多 workspace 待正式版复核）
- **V2 挂载实证**（完整矩阵见 plans/ocp-plugin-dual-compat/experiment-record.md）：**配置式 plugin/plugins 键 2.0.10 全不生效（beta 缺陷），唯一可靠 = `.opencode/plugins/` 约定目录**（symlink 单文件/目录/转发壳均可）；陷阱：`opencode plugin list` 不触发加载不可作判据；V2 共享后台服务持有启动时配置（改配置须杀服务或 `--standalone`）
- **doctor 双轨**：checkPlugin 认 V1 配置键（plugin 优先 plugins 兜底，对象 {package} 前瞻）+ V2 约定目录（realpath/readlink 断链兜底，大小写不敏感，单文件 src/plugin 或目录直链均命中）；文案「全局·配置 / 项目·V2约定目录」
- **devDep**：`@opencode/plugin 2.0.*`（V2 类型线）与 `@opencode-ai/plugin 1.18.*` 并存，均零运行时依赖
- **审查链**：impl REJECT 86（doctor 大小写假阴性+AGENTS.md 未同步）→ PASS 98 → 质量门 98；带病 commit 裁决不 rebase（审计链+教训保留，详见质量门报告）
- **教训**：① 验证命令禁用 `| tail` 吞退出码（曾致类型错误带病提交）；② pkill -f 模式会匹配 shell 自身命令行致会话自杀（`[o]pencode` 技巧）；③ 实验观测指标先证有效性再上矩阵（plugin list 误判返工一轮）

## 环境注意事项

- **checker subagent 跨 worktree 落盘**：会话工作区不在 B 仓根时，edit/write 对 B 仓路径的权限匹配存在已知问题（绝对模式 allow 不生效），checker 经 bash python3 通道落盘可行——根治方案 = 从 B 仓根启动会话（roadmap 档案约定）
- opencode 1.18.31 插件加载行为：`isPathPluginSpec` 识别 file:///./绝对路径；全部运行时导出即插件函数；peerDependencies 的 @opentui/* 为 optional（不装也能 typecheck）
