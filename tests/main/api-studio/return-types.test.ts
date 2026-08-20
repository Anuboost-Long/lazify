import { describe, expect, it } from "vitest";

import { modelFromReturnType } from "../../../src/main/api-studio/reading/return-types";

describe("the model an action says it returns", () => {
  it("unwraps what a framework wraps around it", () => {
    expect(modelFromReturnType("Task<ActionResult<SysUserDto>>")).toEqual({
      model: "SysUserDto",
      collection: false
    });
    expect(modelFromReturnType("ValueTask<Ok<OrderDto>>")).toEqual({
      model: "OrderDto",
      collection: false
    });
    expect(modelFromReturnType("Promise<UserDto>")).toEqual({
      model: "UserDto",
      collection: false
    });
    expect(modelFromReturnType("Observable<UserDto>")).toEqual({
      model: "UserDto",
      collection: false
    });
  });

  it("knows a collection when it sees one", () => {
    expect(modelFromReturnType("Task<IEnumerable<SysUserDto>>")).toEqual({
      model: "SysUserDto",
      collection: true
    });
    expect(modelFromReturnType("Promise<UserDto[]>")).toEqual({
      model: "UserDto",
      collection: true
    });
    expect(modelFromReturnType("Task<ActionResult<List<OrderDto>>>")).toEqual({
      model: "OrderDto",
      collection: true
    });
  });

  it("takes the first of a generic that carries more than one type", () => {
    expect(modelFromReturnType("Results<Ok<UserDto>, NotFound>")).toEqual({
      model: "UserDto",
      collection: false
    });
    expect(modelFromReturnType("Dictionary<string, UserDto>")).toEqual(null);
  });

  it("holds its peace when the type carries no shape", () => {
    expect(modelFromReturnType("Task<IActionResult>")).toBeNull();
    expect(modelFromReturnType("IActionResult")).toBeNull();
    expect(modelFromReturnType("Task<int>")).toBeNull();
    expect(modelFromReturnType("Promise<void>")).toBeNull();
    expect(modelFromReturnType("Task")).toBeNull();
    expect(modelFromReturnType(null)).toBeNull();
    expect(modelFromReturnType("")).toBeNull();
  });

  it("reads a nullable and a namespaced type", () => {
    expect(modelFromReturnType("Task<UserDto?>")).toEqual({ model: "UserDto", collection: false });
    expect(modelFromReturnType("Task<Demo.Api.Models.UserDto>")).toEqual({
      model: "UserDto",
      collection: false
    });
  });
});
