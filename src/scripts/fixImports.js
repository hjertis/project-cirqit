// This script will fix the import statements in TasksPanel.tsx
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "components", "tasks", "TasksPanel.tsx");

// Read the file
let content = fs.readFileSync(filePath, "utf8");

// Fix the imports with literal \n character
const badImportRegex =
  /import \{ parseISO \} from "date-fns";\\nimport \{ formatDateForDisplay, sortTasksByDueDate \} from "..\/..\/utils\/dateUtils";/g;
const duplicateImportRegex = /import \{ formatDateForStorage \} from "..\/..\/utils\/dateUtils";/g;

// First check if we have the problem
if (content.includes("\\n")) {
  console.log("Found escaped newline in import statement, fixing...");

  // Replace the problematic imports with a single import
  content = content.replace(
    badImportRegex,
    'import { parseISO } from "date-fns";\nimport { formatDateForDisplay, sortTasksByDueDate'
  );

  // Remove duplicate import of formatDateForStorage
  if (content.match(duplicateImportRegex)) {
    content = content.replace(
      duplicateImportRegex,
      ', formatDateForStorage } from "../../utils/dateUtils";'
    );
  } else {
    // If there's no duplicate import, make sure we close the first import properly
    content = content.replace(
      /import \{ formatDateForDisplay, sortTasksByDueDate/g,
      "import { formatDateForDisplay, sortTasksByDueDate, formatDateForStorage"
    );
  }
} else {
  // If we don't have the escaped newline problem, make sure we have a single import
  // for all dateUtils functions
  const dateUtilsImportRegex = /import \{ [^}]* \} from "..\/..\/utils\/dateUtils";/g;
  const allDateUtilsImports = content.match(dateUtilsImportRegex) || [];

  if (allDateUtilsImports.length > 1) {
    console.log("Found multiple dateUtils imports, combining them...");

    // Get all imported functions
    const importedFunctions = [];
    allDateUtilsImports.forEach(importStmt => {
      const functionMatch = importStmt.match(/\{ ([^}]*) \}/);
      if (functionMatch && functionMatch[1]) {
        const functions = functionMatch[1].split(",").map(f => f.trim());
        importedFunctions.push(...functions);
      }
    });

    // Create a single import statement with all unique functions
    const uniqueFunctions = [...new Set(importedFunctions)];
    const newImport = `import { ${uniqueFunctions.join(", ")} } from "../../utils/dateUtils";`;

    // Replace all dateUtils imports with our new single import
    allDateUtilsImports.forEach(importStmt => {
      content = content.replace(importStmt, "");
    });

    // Add the new import after the date-fns import
    content = content.replace(
      /import \{ parseISO \} from "date-fns";/,
      `import { parseISO } from "date-fns";\n${newImport}`
    );
  }
}

// Clean up any double newlines that might have been created
content = content.replace(/\n\s*\n\s*\n/g, "\n\n");

// Write the updated content back to the file
fs.writeFileSync(filePath, content, "utf8");

console.log("Fixed import statements in TasksPanel.tsx");
