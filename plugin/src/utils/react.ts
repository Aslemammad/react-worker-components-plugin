export function isComponentishName(name: string) {
  return typeof name === "string" && name[0] >= "A" && name[0] <= "Z";
}
