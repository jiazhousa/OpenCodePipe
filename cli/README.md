# cli/ —— ocp 命令行工具族（Story 3 交付）

`ocp init`（铺设工作流目录 + A 仓模板 + pre-push hook）/ `ocp doctor`（环境自检）/ `ocp worktree`（创建封装 + 分支命名校验）。pre-push：`.stage=DONE` 且质量门 PASS 记录，否则拒绝推送。

> `cli/index.ts` 当前为槽位占位 stub（`console.error("S3 交付")` + 退出码 1），由 Story 3 填充实际实现。
