import { useCallback, useEffect, useState } from "react";

import type { Task, TaskInput, TaskStatus } from "@main/tasks/types";

export function useTasks(projectPath: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!projectPath) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setTasks(await globalThis.lazify.listTasks(projectPath));
    setLoading(false);
  }, [projectPath]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: TaskInput) => {
      const created = await globalThis.lazify.createTask(input);
      await refresh();
      return created;
    },
    [refresh]
  );

  const update = useCallback(
    async (id: string, input: TaskInput) => {
      await globalThis.lazify.updateTask(id, input);
      await refresh();
    },
    [refresh]
  );

  // Moved here first: the list reorders itself on status change, and waiting
  // for a round trip makes the checkbox feel broken.
  const setStatus = useCallback(
    async (id: string, status: TaskStatus) => {
      setTasks((current) => current.map((task) => (task.id === id ? { ...task, status } : task)));
      await globalThis.lazify.setTaskStatus(id, status);
      await refresh();
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      await globalThis.lazify.deleteTask(id);
      await refresh();
    },
    [refresh]
  );

  return { tasks, loading, refresh, create, update, setStatus, remove };
}
