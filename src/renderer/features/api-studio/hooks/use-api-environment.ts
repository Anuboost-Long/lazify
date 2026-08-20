import { useEffect, useRef, useState } from "react";

import {
  customVariableFor,
  deriveEnvironmentVariables,
  withCustomVariables,
  withVariableNames
} from "@main/api-studio/environment";
import type {
  ApiEnvironment,
  ApiEnvironmentSet,
  ApiVariable,
  CustomVariable,
  SavedRouteSummary
} from "../types";

const EMPTY_SET: ApiEnvironmentSet = {
  activeId: "local",
  environments: [{ id: "local", name: "Local", values: {} }],
  variables: [],
  names: {}
};

function uniqueId(existing: ApiEnvironment[]) {
  const taken = new Set(existing.map((environment) => environment.id));

  for (let index = existing.length + 1; ; index += 1) {
    const id = `env-${index}`;
    if (!taken.has(id)) return id;
  }
}

export function useApiEnvironment(projectPath: string, routes: SavedRouteSummary[]) {
  const [set, setSet] = useState<ApiEnvironmentSet>(EMPTY_SET);
  const openProjectPath = useRef(projectPath);
  const variables: ApiVariable[] = withVariableNames(
    withCustomVariables(deriveEnvironmentVariables(routes), set.variables),
    set.names
  );

  useEffect(() => {
    openProjectPath.current = projectPath;
    setSet(EMPTY_SET);

    if (!projectPath) return;

    void globalThis.lazify
      .readApiEnvironments(projectPath)
      .then((stored) => {
        if (openProjectPath.current === projectPath) setSet(stored);
      })
      .catch(() => undefined);
  }, [projectPath]);

  const save = (next: ApiEnvironmentSet) => {
    setSet(next);

    if (!projectPath) return;

    const declared = withVariableNames(
      withCustomVariables(deriveEnvironmentVariables(routes), next.variables),
      next.names
    );
    const known = new Set(declared.map((variable) => variable.name));
    const secretNames = [
      ...declared.filter((variable) => variable.secret).map((variable) => variable.name),
      ...next.environments
        .flatMap((environment) => Object.keys(environment.values))
        .filter((name) => !known.has(name))
    ];

    void globalThis.lazify
      .saveApiEnvironments(projectPath, next, secretNames)
      .then((stored) => {
        if (openProjectPath.current === projectPath) setSet(stored);
      })
      .catch(() => undefined);
  };

  const active =
    set.environments.find((environment) => environment.id === set.activeId) ?? set.environments[0];

  const updateActive = (values: Record<string, string>) =>
    save({
      ...set,
      environments: set.environments.map((environment) =>
        environment.id === active.id ? { ...environment, values } : environment
      )
    });

  const addEnvironment = (name: string, copyFrom?: ApiEnvironment) => {
    const environment: ApiEnvironment = {
      id: uniqueId(set.environments),
      name,
      values: copyFrom ? { ...copyFrom.values } : {}
    };

    save({ ...set, activeId: environment.id, environments: [...set.environments, environment] });
  };

  const renameEnvironment = (id: string, name: string) =>
    save({
      ...set,
      environments: set.environments.map((environment) =>
        environment.id === id ? { ...environment, name } : environment
      )
    });

  const removeEnvironment = (id: string) => {
    const remaining = set.environments.filter((environment) => environment.id !== id);
    if (remaining.length === 0) return;

    save({
      ...set,
      activeId: set.activeId === id ? remaining[0].id : set.activeId,
      environments: remaining
    });
  };

  const freeKey = () => {
    const taken = new Set(variables.map((variable) => variable.key));

    for (let index = set.variables.length + 1; ; index += 1) {
      const key = `custom-${index}`;
      if (!taken.has(key)) return key;
    }
  };

  const freeName = (wanted: string) => {
    const taken = new Set(variables.map((variable) => variable.name));

    if (!taken.has(wanted)) return wanted;

    for (let index = 2; ; index += 1) {
      const name = `${wanted}${index}`;
      if (!taken.has(name)) return name;
    }
  };

  const addVariable = (wanted: string) => {
    const variable = customVariableFor(freeKey(), freeName(wanted));

    save({ ...set, variables: [...set.variables, variable] });

    return variable.key;
  };

  const duplicateVariable = (key: string) => {
    const copied = variables.find((variable) => variable.key === key);

    if (!copied) return null;

    const variable = customVariableFor(freeKey(), freeName(copied.name), copied.secret);
    const value = active.values[copied.name];

    save({
      ...set,
      variables: [...set.variables, variable],
      environments: set.environments.map((environment) =>
        environment.id === active.id && value !== undefined
          ? { ...environment, values: { ...environment.values, [variable.name]: value } }
          : environment
      )
    });

    return variable.key;
  };

  const keepSecret = (key: string, secret: boolean) =>
    save({
      ...set,
      variables: set.variables.map((variable) =>
        variable.key === key ? { ...variable, secret } : variable
      )
    });

  /** A removed value must leave the environments too, secrets first. */
  const removeVariable = (key: string) => {
    const gone = variables.find((variable) => variable.key === key);
    const name = gone?.name ?? key;
    const { [key]: droppedName, ...names } = set.names;

    save({
      ...set,
      names,
      variables: set.variables.filter((variable) => variable.key !== key),
      environments: set.environments.map((environment) => {
        const { [name]: dropped, ...values } = environment.values;

        return { ...environment, values };
      })
    });
  };

  const renameVariable = (key: string, rename: string) => {
    const name = rename.trim();
    const renamed = variables.find((variable) => variable.key === key);

    if (!renamed || !name || name === renamed.name) return;
    if (variables.some((variable) => variable.key !== key && variable.name === name)) return;

    const names = { ...set.names };

    if (name === key) delete names[key];
    else names[key] = name;

    const declared = renamed.custom;

    save({
      ...set,
      names: declared ? set.names : names,
      variables: declared
        ? set.variables.map((variable) =>
            variable.key === key ? { ...variable, name } : variable
          )
        : set.variables,
      environments: set.environments.map((environment) => {
        const { [renamed.name]: carried, ...rest } = environment.values;

        return {
          ...environment,
          values: carried === undefined ? rest : { ...rest, [name]: carried }
        };
      })
    });
  };

  const missing = variables.filter(
    (variable) => !active.values[variable.name]?.trim() && !variable.defaultValue
  );

  return {
    variables,
    environments: set.environments,
    active,
    values: active.values,
    missing,
    selectEnvironment: (id: string) => save({ ...set, activeId: id }),
    updateActive,
    addVariable,
    duplicateVariable,
    keepSecret,
    removeVariable,
    renameVariable,
    addEnvironment,
    renameEnvironment,
    removeEnvironment
  };
}
