# check-tools/ —— 机械检查工具（Story 3 交付，`ocp check <name>` 路由）

每项一个纯逻辑模块（可独立 import 测试）；规则数据在 `configs/`（JSON 可配置，缺失时回退内置默认）。退出码：0=通过；1=检查失败；2=用法错误。

| 检查项 | 模块 | 规则 |
|---|---|---|
| `whitespace` | whitespace.ts | 尾随空白（行末空格/Tab）+ 文件末尾缺换行；扫描范围 = codePatterns 白名单（单一配置源 `configs/prepush-config.json`，与 pre-push 代码判定共用）；输出 `文件:行号:类型` |
| `line-budget` | line-budget.ts | 工件行数预算（`configs/line-budget.json`，06 卷口径）：spec ≤300 / epic-spec ≤500 / issue-impl ≤80 / Epic Spec 报告 ≤40 / Spec 报告 ≤30；**规则表按序匹配、首个命中生效**（epic 规则先于 spec 规则，防通配重叠误伤）；impl.md 与 impl/issue-impl/质量门报告不设上限（不配规则）；取终稿口径——glob 只匹配终稿文件名，草案与过程稿不检 |
| `commit-format` | commit-format.ts | 首行 `<type>: <描述>`；type ∈ {feat, fix, docs, chore, refactor, test, style}（`configs/commit-format.json` 可配置）；描述至少一个 CJK 字符；merge commit（Merge / Merge branch / Merge pull request 开头）跳过；`--range HEAD~3..HEAD` 指定区间，默认 HEAD 单条 |
| `transition-consistency` | transition-consistency.ts | 转移表三层：① vendored 十件哈希逐一重算 ② 数据文件 schema 自校验 ③ 快照对账（双向）；已纳入 fence 第四步（`bun scripts/run-test-fence.ts`） |
| `platform-words` | platform-words.ts | 平台词扫描（`configs/platform-words.json`：words 内置集 + extraWords 项目扩展位）；词形边界匹配、大小写敏感；**默认扫 vendored 07 + templates 九件；全仓检查以 `--path <目录>` 指向 A 仓执行**（Epic 验收 6 口径——A 仓规范卷须平台无关，S1 验收的回归锚点） |

预留 `task-yaml.ts`（S5：Task.yaml 七项图论校验模块位，四层工作流试点）。
