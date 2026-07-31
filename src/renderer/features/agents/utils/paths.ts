/** Splits a repo-relative path into the folder part and the file name. */
export function splitPath(filePath: string) {
  const index = filePath.lastIndexOf("/");

  return index === -1
    ? { directory: "", name: filePath }
    : { directory: filePath.slice(0, index + 1), name: filePath.slice(index + 1) };
}
