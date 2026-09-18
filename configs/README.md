# configs/ —— 可配置数据（Story 2/3 交付）

状态转移表数据文件（A 仓 07 契约的机读形态）、Git 分支策略、代码审查规则库（自 v1 迁移，獬豸字段清理为后续项）。

> review-rules/：checker 代码质量审查规则库纯净源（20 语言规则 + `default.md` 兜底 + `system_rules.json` 后缀映射，21 件）。部署实例在用户域 `~/.config/opencode/review-rules/`（部署动作见 docs/agents-adoption.md 环境值 #4）。

> Story 3 新增配置：prepush-config（代码白名单）、line-budget（行数规则）、commit-format（type 集）、platform-words（词表）、worktree-config（分支校验）、transition-snapshot（边集快照）、vendor/（A 仓契约副本 + 哈希声明）。各文件头部注释为字段说明。
