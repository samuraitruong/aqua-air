import { test } from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";
import { readFileSync } from "node:fs";
test("new native screens do not render literal whitespace strings directly inside View", () => {
  const violations: string[] = [];
  for (const file of [
    "app/tank/insights.tsx",
    "app/tank/journal.tsx",
    "app/tank/preferences.tsx",
    "app/tank/export.tsx",
    "app/journal/edit.tsx",
    "src/ui/parameter-chart.tsx",
  ]) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isJsxElement(node) &&
        node.openingElement.tagName.getText(source) === "View"
      )
        for (const child of node.children)
          if (
            ts.isJsxExpression(child) &&
            child.expression &&
            ts.isStringLiteral(child.expression)
          )
            violations.push(
              file + ":" + source.getLineAndCharacterOfPosition(child.pos).line,
            );
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  assert.deepEqual(violations, []);
});
