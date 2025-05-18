// date-fns Usage Guide with @mui/x-date-pickers
// This file provides examples of how to properly use date-fns v2.30.0 with MUI DatePicker

import { format, parseISO, isValid } from "date-fns";

// 1. Converting Date object to string for storage
// Use this when saving dates to Firestore
const formatDateForStorage = (date: Date | null): string | undefined => {
  if (!date || !isValid(date)) return undefined;
  return format(date, "yyyy-MM-dd"); // ISO format for consistent storage
};

// IMPORTANT: If you're getting the error: [plugin:vite:react-babel] Unexpected reserved word 'await'
// in the TasksPanel.tsx file, replace this line:
//    ...(dueDate && { dueDate: format(dueDate, 'yyyy-MM-dd') }),
// with this:
//    ...(dueDate && { dueDate: dueDate.toISOString().split('T')[0] }),
// OR use the formatDateForStorage function from this file:
//    ...(dueDate && { dueDate: formatDateForStorage(dueDate) }),

// 2. Parsing ISO string from storage to Date object
// Use this when retrieving dates from Firestore
const parseDateFromStorage = (dateString: string | undefined): Date | null => {
  if (!dateString) return null;
  try {
    const date = parseISO(dateString);
    return isValid(date) ? date : null;
  } catch (error) {
    console.error("Invalid date string:", error);
    return null;
  }
};

// 3. Formatting dates for display
// Use this for user-friendly date display
const formatDateForDisplay = (dateString: string | undefined): string => {
  if (!dateString) return "No date set";
  try {
    const date = parseISO(dateString);
    return isValid(date) ? format(date, "MMM d, yyyy") : "Invalid date";
  } catch (error) {
    return "Invalid date";
  }
};

// 4. Sorting dates (example for task sorting)
const sortTasksByDueDate = (tasks: any[]) => {
  return [...tasks].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    const dateA = parseISO(a.dueDate);
    const dateB = parseISO(b.dueDate);

    if (!isValid(dateA)) return 1;
    if (!isValid(dateB)) return -1;

    return dateA.getTime() - dateB.getTime();
  });
};

// 5. Example usage with MUI DatePicker
/*
<LocalizationProvider dateAdapter={AdapterDateFns}>
  <DatePicker
    label="Due Date (Optional)" 
    value={dueDate}
    onChange={(newDate) => setDueDate(newDate)}
    slotProps={{ 
      textField: { 
        fullWidth: true, 
        margin: "dense", 
        sx: { mb: 2 } 
      } 
    }}
  />
</LocalizationProvider>

// When saving to Firestore:
const handleAddTask = async () => {
  if (newTask.trim()) {
    await addTaskToFirestore.mutateAsync({
      text: newTask,
      ...(dueDate && { dueDate: formatDateForStorage(dueDate) }),
      ...(priority && { priority })
    });
    setNewTask("");
    setDueDate(null);
    setPriority("");
    setAddTaskDialogOpen(false);
  }
};
*/

export { formatDateForStorage, parseDateFromStorage, formatDateForDisplay, sortTasksByDueDate };
