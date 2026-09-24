# 实验记录：OpenCode V1(1.18.31) × V2(2.0.10) 插件兼容实证

**日期**：2026-09-20 ｜**环境**：本机 1.18.31（生产）/ V2 npm `@opencode/cli-linux-x64@2.0.10`（独立路径 `/tmp/opencode/v2bin`，XDG 三目录隔离，不覆盖生产 binary）

## 实验 1：1.18.31 default 对象入口（object entrypoint）

观测法：插件 default export `{id, setup, server}`，各方法写 MARK 文件；`opencode run` 触发。

| 观测 | 结果 |
|---|---|
| `server()` 被调 | ✅（返回的 V1 tool map 正常注册，工具被模型调用，execute 执行实证） |
| `setup()` 被调 | ✅（1.18.31 前向误调）——传入 ctx 为普通 object，**无 `tool.transform` 域**（形态防御走 else 分支实证） |
| named export 非函数 | 抛 TypeError（D1 既有实证，本次未复测） |
| 挂载形态 | `file://单文件` / `绝对路径字符串` / `[路径, {}] 元组` 三形态等价 ✅ |

结论：**双形状成立**——server() 承载 V1 语义，setup() 做形态防御后跳过。

坑：实验目录无 node_modules 时插件 import 静默失败（无报错无日志）——import 解析锚=文件物理位置，B 仓挂载生产形态不受影响。

## 实验 2：V2 setup() 形状验证

V2 获取：npm 平台包（`curl opencode.ai/update/api/latest/cli/npm` → 2.0.10，ref v2 分支）；GitHub v2.x 仅 git tag 无 release 二进制；installer `https://opencode.ai/v2/install`。

| 观测 | 结果 |
|---|---|
| `.opencode/plugins/` 约定目录自动发现 | ✅ setup 被调，`ctx.tool.transform` 域存在（真 V2 ctx），注册链路 `editor.add` 正常 |
| `server()` 在 V2 | 未被调（符合设计，互不干扰） |
| 手写形状（不经 `Plugin.define()`） | ✅ 被接受 |
| 手写 V1 工具对象（裸 {description, args:{}, execute}，无 tool() helper） | ✅ 在 1.18.31 可注册（备用结论） |

## 实验 3：挂载矩阵（V2，run 触发 + MARK 硬观测）

| 形态 | 加载 |
|---|---|
| 配置 `"plugin"` 键 file://目录（V1 键归一化路径） | ❌ |
| 配置 `"plugins"` 键 file://目录 | ❌ |
| 配置 `"plugins"` 键 `{package: 单文件}` | ❌ |
| 配置 `"plugins"` 键裸字符串目录 | ❌ |
| 约定目录 + 拷贝单文件 | ✅ |
| 约定目录 + symlink 目录 | ✅ |
| 约定目录 + symlink 单 .ts | ✅ |
| 约定目录 + 转发壳（真文件 re-export 绝对路径） | ✅ |

## 陷阱与运维注意（V2）

1. **`opencode plugin list` 不触发加载**——只列注册表（曾致矩阵误判"No plugins found"，全部结论以 MARK 文件为准重跑修正）
2. **共享后台服务持有启动时配置**——改配置不生效直到服务重启；调试用 `--standalone` 或 `pkill -f "opencode.*serve"`（注意 pkill 模式别匹配自身命令行，`[o]pencode` 技巧）
3. V2 默认 free 模型（jev/nemotron）间歇 500（Internal server error）——与插件无关，观测插件不需要模型成功
4. V2 读项目级 V1 `opencode.json` 的 `plugin` 键（归一化尝试）但单文件路径报 WARN "must be a directory"——**生产项目级 V1 配置在 V2 下会告警不生效**，全局配置同理
5. LSP：V2 接受 `lsp` 配置但不运行语言服务器；`compaction.prune` 忽略带警告（均知悉项，非本 Issue 范围）

## V2 基础设施事实

- V2 分发渠道：npm `@opencode/cli-*` 平台包 / installer `https://opencode.ai/v2/install`（支持 `--version`）；与 V1 同 `opencode` 命令不并存
- V2 SDK：`@opencode/plugin@2.0.10` 已发 npm（latest）——本仓仅 devDep 引类型，运行时不 import
- V2 服务模型：共享后台服务 + `--standalone` 私有服务；`opencode debug paths` 查路径；日志在 `{data}/opencode/log/opencode.log`

## 追加实验（2026-09-20 下午）：V2 全局挂载路径——痛点解除

背景：用户提出升级动机（多 session 共享 server 省内存，多会话并发场景刚需），全局挂载失效为最大障碍。

| 路径 | 结果 |
|---|---|
| P1 `~/.config/opencode/plugins/`（全局配置目录下约定目录） | ✅ **被 V2 认**（setup 执行，真 V2 ctx）——配置式挂载的替代品，V2 未删除全局能力而是换了位置 |
| P3 共享 server 多项目 | ✅ **per-location 插件实例**：项目 B/C 连同一共享 server，各自获得 `ctx.location.directory=自己项目根` 的实例——stage 工具目录锚与 V1 `context.directory` 语义完全对齐，多项目/多 workspace 互不串扰 |

**生产迁移方案（一条命令全局恢复）**：
```bash
mkdir -p ~/.config/opencode/plugins
ln -s <B仓>/src/plugin/index.ts ~/.config/opencode/plugins/ocp-stage.ts
```

**升级评估更新**：stage 全局挂载障碍 ✅ 解除（且 per-location 语义优于 V1）；剩余预检项=provider（zhipuai CodingPlan）V2 路由实证 + agents 五件 V2 识别实证 + V1 会话历史不迁移（备份 `~/.opencode/bin/opencode` 可回退）+ LSP 缺失（fence 兜底，影响有限）。

## 追加实验（2026-09-20 晚）：升级预检全清——provider/credential/agent 路由

模拟升级环境（生产 V1 db 拷贝 + agents 五件 + auth.json + V2 binary）逐层实证：

| 层 | 结论 |
|---|---|
| 会话自动迁移 | ✅ V2 打开同路径 db 自动跑迁移链（migration 表留痕）：session_v2 751 行真实历史会话 + session_message 30333 行；V1 session 表 3822 行保留（空壳/系统会话被过滤） |
| credential | ⚠️ V1 auth.json（文件）→ V2 db credential 表**不自动迁移**；解法=API key 内联进 providers 段 settings.apiKey（auth 体系可绕开） |
| provider 目录 | ✅ models.dev 统一后台含 zhipuai-coding-plan（用户判断正确，非白名单丢失）；V2 自定义 providers 段形态：`{package: "aisdk:@ai-sdk/openai-compatible", settings: {baseURL, apiKey}, models: {glm-5.3: {...}}}`——**models 声明必填**（目录化设计不自动拉列表），baseURL=https://open.bigmodel.cn/api/coding/paas/v4 |
| agent 加载 | ✅ 五件全被发现（debug agents 命令验证），frontmatter V1 分离形态自动翻译（model+variant 解析正确） |
| **agent 会话路由** | ✅ **破案：V2 run 会话按顶层 config.model 选模型，agent.model 不生效**（V1 是 agent.model 优先）——顶层默认未配时落 jev free（且该免费模型时好时坏 500，曾致误判）；解法=全局配置加 `"model": "zhipuai-coding-plan/glm-5.3"`；`-m provider/model[#variant]` 直连两种形态均通 |
| 验证方法教训 | 三分法定位：①`debug agents`（定义/解析层）②`-m` 直连（provider/凭证层）③`--agent` 全链路——三层分开测才能定位到会话模型选择逻辑；replace 前必须 cat 实际形态（两次静默失败教训） |

**遗留待升级后真机确认**：subagent（task 派发）模型路由是否按各自 agent.model（影响 checker 走 deepseek 的成本分化）或同样落 config.model；TUI 交互会话模型选择行为。

**升级 checklist（终版）**：① 备份 V1 binary + opencode.db ② 安装 V2（opencode.ai/v2/install）③ providers 段（zhipuai + deepseek，key 从 auth.json 抄，models 声明齐）④ 顶层 model 默认 ⑤ `~/.config/opencode/plugins/` symlink stage 插件 ⑥ 首次会话验证：agents 五件路由 + subagent 模型分化 + stage 工具 ⑦ OpenCodeQuota 适配（待定位）

## 迁移实录（2026-09-20 晚，生产升级完成）

1.18.31 → 2.0.10 生产升级执行全记录（六步全过）：

| 步骤 | 结果 |
|---|---|
| ① 配置预置 | providers 段（zhipuai+deepseek，key 内联）+ 顶层 model=glm-5.3（V1 兼容忽略未知键） |
| ② 插件全局挂载 | `~/.config/opencode/plugins/ocp-stage.ts` → B 仓入口 |
| ③ 备份 | V1 binary 185MB + db 一致性备份 5.2GB（session 3830 行校验一致） |
| ④ 安装 | 2.0.11 镜像 404 → 装 2.0.10；替换式，`opencode --version` 确认 |
| ⑤ 首会话冒烟 | oracle→glm-5.3 路由 ✅；stage_get 工具调用 ✅；db 自动迁移 session_v2=778 ✅ |
| ⑥ subagent 分化 | 定义层五角色全解析（checker→deepseek/deepseek-flash#max 成本分化保住）；运行时 task 派发 explorer+checker 双链路实证 ✅ |

**迁移中发现的 V2 坑（四项，均已处置）**：
1. **V1 json `agent` 段的 model 配置被 V2 屏蔽**（md 文件是权威，md 无 model → 空）→ model/variant 写进部署版五件 md frontmatter；title 定制与内置禁用（explore/plan/build）转 `agents` 原生键（disable→disabled）
2. **`temperature` frontmatter 字段 V2 不认 → 整条 model 解析失败**（checker ∅ 根因）→ 删除（0.1 低温定制暂失，V2 request.body 形态可补回——遗留小项）
3. **共享服务缓存 agent 定义**：改 md 后必须杀服务冷启动才重载（调试期多次 ∅ 假象皆此）——`kill $(pgrep -f "[o]pencode serve")`
4. **db .backup 超时中断产生不完整备份**（quick_check ok 但缺表）——备份校验必须查行数非 quick_check；正确姿势=tmux 后台跑+行数比对

**遗留观察项**：checker temperature 补回（request.body）；title 生成器中文前缀 prompt 在 V2 的生效性（agents.title 段归一化待观察）；TUI 交互首用体验；OpenCodeQuota 适配（用户挂账）。

---

## 2026-09-21 web 调研补录：官方双线格局 + 留 V2 决策

### 官方格局（实查 GitHub anomalyco/opencode + opencode.ai）
- **V1 主线（1.18.x）**：官方 changelog 主推，最新 1.18.31（09-14）。TUI 插件系统完整——`packages/opencode/specs/tui-plugins.md`（dev 分支，544 行）：协议 `{id?, tui}` + `tui.json` 配置，slots 体系齐全（sidebar_content/title/footer、home_prompt_right、session_prompt_right 等 14 个宿主 slot），keymap/route/ui/theme/toast 全域
- **V2 重写线（2.0.x beta）**：无 release 条目仅 tag，最新 2.0.11（09-20，即本机版本）。迭代节奏每天 1-2 版（2.0.9→10→11 在 09-19~20 两天连发）。协议统一 `{id, setup}`（$At 谓词：id 非空 string + setup function），setup ctx 25 域全 server 语义，**UI 域未接线**但 slots/markdown 注册基础设施在 binary 内完整保留
- `2.0` 分支是 4 月停掉的 exploration 残骸（version 1.4.3），V2 真身在 tag v2.0.x
- 官方做 V1/V2 混合兼容（v1.18.12/19/24 changelog 三处证据）
- V2 的 cli.json = CLI/TUI 侧插件通道（文档明示），opencode.json plugins = server 侧

### 决策（用户拍板）
- **留 V2（2.0.11）等 UI 域接线**，不回 V1 双 binary 并存
- 过渡方案：`~/bin/quota`（GLM 5h/周窗 + DeepSeek 余额，凭证自动读 V2 config）
- OpenCodeQuota v0.0.2 挂 GitHub（README 已注明协议过渡版），业务层（凭证链/额度拉取）已对 2.0.11 实证

### 盯梢触发条件
V2 升级后跑 setup ctx 探针（`{id, setup}` 形态 + dump ctx keys，模板见 09-20 记录）：ctx 一旦出现 slots/ui/theme 域 → 启动适配（改 tui.tsx 挂 sidebar_content slot，预计小时级）。注意 v0.0.2 的 tui.tsx 用的是 1.4.8 类型包字段（value/onSelect），V1 运行时规格是 name/title/run/slashName——若接线后协议另有字段名，以运行时探针为准

## 2026-09-21 补：title 生成器定制在 V2 恢复（遗留观察项闭环）
- 现象：V2 后 session 标题全裸（无 Fix-/Feature- 前缀）——`agents.title` json 段 V2 不解析（debug agents 空实证）
- 恢复：定制转 `~/.config/opencode/agents/title.md`（frontmatter `model: zhipuai-coding-plan/glm-5.3-flash`，六前缀 prompt 写 body；**不写 temperature**——V2 不认会炸整条 model 解析）
- 生效验证：`opencode reload` 优雅重载（**无需杀共享服务**——杀服务会断自己的会话，工具执行一起被带断，title.md 写入都丢了）；API /api/agent 见 title 条目 model=glm-5.3-flash；实测 run 一轮对话标题 `Fix-工单列表导出Excel乱码排查`（前缀+中文+flash 全对）
- V2 内置特殊 agent 体系：title/compaction/summary（compaction/summary model=None 继承默认，可同法 md 覆盖）
- json 死配置已删（备份 opencode.json.bak-20260921-title）

## 2026-09-25 补：V2 UI 域接线实证（2.0.16，盯梢条件闭环）

09-21 盯梢条件在 2.0.16 命中——CLI/TUI 侧插件通道完整接线，quota TUI 适配启动条件成立。

### 挂载形态（MARK 硬观测矩阵，TUI 侧）

| 形态 | TUI 侧加载 |
|---|---|
| cli.json plugins file URL（run/TUI 双触发） | ❌ |
| 约定目录裸单文件（plugins/x.ts） | 仅 server 侧 |
| 约定目录 index.ts（plugins/x/index.ts） | 仅 server 侧 |
| **完整包结构 plugins/\<name\>/{package.json exports "./tui", tui.tsx}** | ✅ **TUI 侧加载**（index.ts 同时被 server 侧消费） |

### CLI/TUI 侧 setup ctx（13 域）

`app / attention / client / data / keymap / location / markdown / options / renderer / storage / theme / themeMode / ui`

ui API 面：`dialog{show/set/clear/alert/confirm/prompt/select}`、`toast.show`、`format.path`、`router{register/navigate/current}`、`panel{open/close/current}`（仅 session 路由）、`tabs{enabled/list/open/focus/move/close}`、`slot(claim)`

### ui.slot 用法（binary 源码逆向 + 实测）

- claim 形态：`ui.slot({ <placement>: "<布局路径>", render })`——placement 五选一（prepend/append/before/after/replace），**恰好一个**
- 布局路径清单（binary `path:"..."` 全集）：`sidebar.content`（quota 侧栏位）、`sidebar.footer`、`session.panel`、`session.composer.top`、`home.footer`、`home.footer.status`、`prompt.footer`、`prompt.footer.file`、`prompt.footer.status`
- target 用裸名（如 "sidebar"）claim **不报错但布局零消费**（render 永不被调，静默）——必须用完整布局路径
- **render 必须返回 OpenTUI 组件**：裸字符串进渲染管线触发 Orphan text error → **TUI 崩溃**（crash screen 自动生成 issue 链接）；`<text>` 实测上屏成功
- JSX / @opentui/solid 由宿主内嵌 bun-plugin-solid 转换与解析（插件目录无需 node_modules）

### 实证记录

tmux PTY 起 TUI + capture-pane 截屏：`ui.slot({append:"sidebar.content", render:()=>(<text>PROBE-SIDEBAR-RENDER-OK</text>)})` 于会话视图右侧栏渲染成功（2026-09-24 16:42 UTC，2.0.16，零错误）。

### quota 适配工作重估

- UI 层：V1 Solid/OpenTUI 渲染代码（quota 仓 src/tui.tsx 水平条/卡片）同底座直接搬入 slot render——复用度高
- 业务层：凭证链/额度拉取已对 2.0.11 实证（quota v0.0.2）
- 实际工作量：挂载层改造（单文件 file URL → 完整包结构）+ host 探测适配（ctx 形态、存储路径、版本门放宽 2.x）
