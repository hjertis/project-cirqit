// This script will fix the date formatting issue in TasksPanel.tsx
const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "..", "components", "tasks", "TasksPanel.tsx");

// Read the file
let content = fs.readFileSync(filePath, "utf8");

// Replace the problematic date formatting line
content = content.replace(
  /\.\.\.\(dueDate && \{ dueDate: format\(dueDate, ['"]yyyy-MM-dd['"]\) \}\),/g,
  '...(dueDate && { dueDate: dueDate.toISOString().split("T")[0] }),'
);

// Write the updated content back to the file
fs.writeFileSync(filePath, content, "utf8");
