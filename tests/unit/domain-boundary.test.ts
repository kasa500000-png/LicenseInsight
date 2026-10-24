import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

function domainFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? domainFiles(full) : full.endsWith(".ts") ? [full] : [];
  });
}
it("keeps every domain module independent of IO, storage, and an implicit current clock", () => {
  const root = path.resolve("src/domain");
  const failures: { file: string; code: string }[] = [];
  const forbidden = new Set(["process", "window", "document", "localStorage", "sessionStorage", "fetch", "XMLHttpRequest", "navigator", "globalThis", "setTimeout", "setInterval"]);
  for (const file of domainFiles(root)) {
    const ast = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    function visit(node: ts.Node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = node.moduleSpecifier.text;
        if (!target.startsWith("./") || !path.resolve(path.dirname(file), target).startsWith(root + path.sep)) failures.push({ file, code: "EXTERNAL_DEPENDENCY" });
      }
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["require", "eval"].includes(node.expression.text)) failures.push({ file, code: "DYNAMIC_DEPENDENCY" });
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) failures.push({ file, code: "DYNAMIC_DEPENDENCY" });
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Date") failures.push({ file, code: "IMPLICIT_CLOCK" });
      if (ts.isIdentifier(node) && forbidden.has(node.text)) failures.push({ file, code: "IO_OR_STORAGE_ACCESS" });
      if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Date" && !node.arguments?.length) failures.push({ file, code: "IMPLICIT_CLOCK" });
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Date" && node.name.text === "now") failures.push({ file, code: "IMPLICIT_CLOCK" });
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "Math" && node.name.text === "random") failures.push({ file, code: "NONDETERMINISTIC_INPUT" });
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  expect(failures).toEqual([]);
});
