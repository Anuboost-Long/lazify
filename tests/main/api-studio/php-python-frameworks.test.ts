import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { deriveEnvironmentVariables, scanProjectRoutes } from "../../../src/main/api-studio";

let projectPath: string;

const LARAVEL_ROUTES = `<?php

use Illuminate\\Support\\Facades\\Route;

Route::get('/health', [HealthController::class, 'show']);

Route::prefix('v1')->group(function () {
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [ProfileController::class, 'show']);
        Route::apiResource('posts', PostController::class);
    });
});

Route::group(['prefix' => 'admin'], function () {
    Route::delete('/users/{id}', [AdminController::class, 'destroy']);
});
`;

const LARAVEL_KEY_MIDDLEWARE = `<?php

namespace App\\Http\\Middleware;

class ApiKeyMiddleware
{
    public function handle($request, Closure $next)
    {
        if ($request->header('X-Client-Key') !== config('app.key')) {
            abort(401);
        }

        return $next($request);
    }
}
`;

const FASTAPI_MAIN = `from fastapi import APIRouter, Depends, FastAPI, Security
from fastapi.security import APIKeyHeader

from .schemas import ItemCreate

api_key_header = APIKeyHeader(name="X-API-KEY")

app = FastAPI()
router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{user_id}")
async def read_user(user_id: int, include: str = None):
    return {}


@router.post("/")
async def create_user(item: ItemCreate, page: int = 1):
    return {}


app.include_router(router, prefix="/api/v1", dependencies=[Security(api_key_header)])


@app.get("/health")
def health():
    return {"ok": True}
`;

const FASTAPI_SCHEMAS = `from enum import Enum

from pydantic import BaseModel


class Tier(str, Enum):
    FREE = "free"
    PAID = "paid"


class ItemCreate(BaseModel):
    name: str
    count: int
    tier: Tier
    tags: list
`;

const FLASK_APP = `from flask import Blueprint, Flask, request

app = Flask(__name__)
api = Blueprint("api", __name__, url_prefix="/api")


@api.route("/users", methods=["GET", "POST"])
def users():
    return {}


@api.route("/users/<int:user_id>")
def user(user_id):
    return {}


@api.delete("/users/<int:user_id>/sessions")
def end_session(user_id):
    return {}


app.register_blueprint(api, url_prefix="/api/v1")
`;

async function writeProject(files: Record<string, string>) {
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(projectPath, relativePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, content, "utf8");
  }
}

beforeEach(async () => {
  projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "lazify-php-python-"));
});

afterEach(async () => {
  await fs.rm(projectPath, { recursive: true, force: true });
});

describe("Laravel, from its rule set alone", () => {
  it("carries a group's prefix into every route the block holds", async () => {
    await writeProject({
      "composer.json": JSON.stringify({ require: { "laravel/framework": "^11.0" } }),
      "artisan": "#!/usr/bin/env php",
      "routes/api.php": LARAVEL_ROUTES
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.scannersRun).toEqual(["laravel"]);
    expect(result.routes.map((route) => `${route.method} ${route.path}`).sort()).toEqual([
      "DELETE /admin/users/{id}",
      "DELETE /v1/posts/{id}",
      "GET /health",
      "GET /v1/me",
      "GET /v1/posts",
      "GET /v1/posts/{id}",
      "GET /v1/users",
      "POST /v1/posts",
      "POST /v1/users",
      "PUT /v1/posts/{id}"
    ]);
  });

  it("guards what an auth middleware group holds, and nothing outside it", async () => {
    await writeProject({
      "composer.json": JSON.stringify({ require: { "laravel/framework": "^11.0" } }),
      "routes/api.php": LARAVEL_ROUTES
    });

    const result = await scanProjectRoutes(projectPath);
    const me = result.routes.find((route) => route.path === "/v1/me")!;
    const users = result.routes.find((route) => route.path === "/v1/users")!;

    expect(me.security.map((security) => security.kind)).toEqual(["bearer"]);
    expect(users.security).toEqual([]);
  });

  it("reads the header its api key middleware checks", async () => {
    await writeProject({
      "composer.json": JSON.stringify({ require: { "laravel/framework": "^11.0" } }),
      "routes/api.php": `<?php
Route::middleware('api-key')->group(function () {
    Route::get('/reports', [ReportController::class, 'index']);
});
`,
      "app/Http/Middleware/ApiKeyMiddleware.php": LARAVEL_KEY_MIDDLEWARE
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.routes[0].security).toContainEqual({
      kind: "apiKey",
      schemeName: "ApiKey",
      location: "header",
      parameterName: "X-Client-Key"
    });
    expect(deriveEnvironmentVariables(result.routes).map((variable) => variable.name)).toContain(
      "xClientKey"
    );
  });
});

describe("FastAPI, from its rule set alone", () => {
  it("joins a router's prefix and the prefix it is included under", async () => {
    await writeProject({
      "requirements.txt": "fastapi==0.111.0\nuvicorn==0.30.0\n",
      "app/main.py": FASTAPI_MAIN,
      "app/schemas.py": FASTAPI_SCHEMAS
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.scannersRun).toEqual(["fastapi"]);
    expect(result.routes.map((route) => `${route.method} ${route.path}`).sort()).toEqual([
      "GET /api/v1/users/{user_id}",
      "GET /health",
      "POST /api/v1/users"
    ]);
  });

  it("types the path parameter and binds a pydantic body", async () => {
    await writeProject({
      "requirements.txt": "fastapi\n",
      "app/main.py": FASTAPI_MAIN,
      "app/schemas.py": FASTAPI_SCHEMAS
    });

    const result = await scanProjectRoutes(projectPath);
    const create = result.routes.find((route) => route.method === "POST")!;

    expect(JSON.parse(create.requestBody!.variants[0].defaultBody!)).toEqual({
      name: "string",
      count: 0,
      tier: "free",
      tags: ["string"]
    });
  });

  it("requires the api key header its dependency declares", async () => {
    await writeProject({
      "requirements.txt": "fastapi\n",
      "app/main.py": FASTAPI_MAIN,
      "app/schemas.py": FASTAPI_SCHEMAS
    });

    const result = await scanProjectRoutes(projectPath);
    const names = deriveEnvironmentVariables(result.routes).map((variable) => variable.name);

    expect(result.routes[0].security).toContainEqual({
      kind: "apiKey",
      schemeName: "X-API-KEY",
      location: "header",
      parameterName: "X-API-KEY"
    });
    expect(names).toContain("xApiKey");
  });
});

describe("Flask, from its rule set alone", () => {
  it("reads the methods a route states in its argument, under the prefix it is registered with", async () => {
    await writeProject({
      "requirements.txt": "flask==3.0.0\n",
      "app.py": FLASK_APP
    });

    const result = await scanProjectRoutes(projectPath);

    expect(result.scannersRun).toEqual(["flask"]);
    expect(result.routes.map((route) => `${route.method} ${route.path}`).sort()).toEqual([
      "DELETE /api/v1/users/{user_id}/sessions",
      "GET /api/v1/users",
      "GET /api/v1/users/{user_id}",
      "POST /api/v1/users"
    ]);
  });

  it("types a converter in the path it declares", async () => {
    await writeProject({ "requirements.txt": "flask\n", "app.py": FLASK_APP });

    const result = await scanProjectRoutes(projectPath);
    const one = result.routes.find((route) => route.path === "/api/v1/users/{user_id}")!;

    expect(one.parameters).toEqual([
      {
        name: "user_id",
        location: "path",
        required: true,
        description: null,
        schemaType: "integer",
        example: null
      }
    ]);
  });
});
