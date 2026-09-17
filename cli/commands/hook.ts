// ocp hook——pre-push 校验入口 stub（块B 重写填充：stdin refs 解析 + git diff + hook-core 校验）。
// 路由能到、编译能过即可。
export async function main(): Promise<number> {
  console.error("块B 交付");
  process.exit(2);
}
