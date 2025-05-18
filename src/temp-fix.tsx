// Fixed version of handleAddTask
const handleAddTask = async () => {
  if (newTask.trim()) {
    await addTaskToFirestore.mutateAsync({
      text: newTask,
      ...(dueDate && { dueDate: formatDateForStorage(dueDate) }),
      ...(priority && { priority }),
    });
    setNewTask("");
    setDueDate(null);
    setPriority("");
    setAddTaskDialogOpen(false);
  }
};
