import { useEffect, useRef, useState } from "react";

import {
  customVariableFor,
  deriveEnvironmentVariables,
  withCustomVariables
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
  variables: []
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
  const variables: ApiVariable[] = withCustomVariables(
    deriveEnvironmentVariables(routes),
    set.variables
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

    const declared = withCustomVariables(deriveEnvironmentVariables(routes), next.variables);
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

  const addVariable = (
    parameterName: string,
    location: CustomVariable["location"],
    secret: boolean
  ) => {
    const variable = customVariableFor(parameterName, location, secret);

    if (variables.some((existing) => existing.name === variable.name)) return;

    save({ ...set, variables: [...set.variables, variable] });
  };

  /** A removed value must leave the environments too, secrets first. */
  const removeVariable = (name: string) =>
    save({
      ...set,
      variables: set.variables.filter((variable) => variable.name !== name),
      environments: set.environments.map((environment) => {
        const { [name]: dropped, ...values } = environment.values;

        return { ...environment, values };
      })
    });

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
    removeVariable,
    addEnvironment,
    renameEnvironment,
    removeEnvironment
  };
}
