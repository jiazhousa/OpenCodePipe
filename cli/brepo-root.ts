// B 仓根定位——vendored 模板 / fence 模板 / worktree 配置等自带资源的路径锚点。
// 无论从源码直跑还是 bin 链接安装，cli/brepo-root.ts 的上一级即 B 仓根。
import { fileURLToPath } from "node:url";

/** 返回 B 仓根绝对路径（带尾分隔符） */
export function brepoRoot(): string {
  return fileURLToPath(new URL("../", import.meta.url));
}
