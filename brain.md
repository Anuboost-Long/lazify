````
### Important this feature will reside in the brain directory where it will have a directory as one feature called stack detection and will split each functionality to smaller files for readability and accessibility
for saved logic or fixed data should also be saved in a directory with the name of resource or memory

# Project Template Engine + Stack Detection Brain

## 1. Goal

Build a desktop app feature that can import an existing project, allow the user to select only the useful files/folders, save that selected structure as a reusable JSON template, and automatically detect what kind of project stack it is.

The tool should be able to answer:

1. What framework/stack is this project?
2. Is it React Vite, Next.js, Expo React Native, React Native CLI, Electron, Node API, etc.?
3. What package manager does it use?
4. What command should be used to install dependencies?
5. What command should be used to run the project?
6. What command should be used to build, preview, test, or start the project?
7. How confident is the detection?
8. What evidence was used to make the detection?

The system should not just save a file tree. It should become a smart project template engine that understands the structure, stack, and usage of the imported project.

---

# 2. Main Concept

The current app imports a project and saves selected files/folders into JSON.

This should be improved into:

> Intelligent Project Template Engine

The final template should contain:

- Selected file/folder structure
- Relative file paths
- Optional content for safe text files
- Stack detection result
- Package manager
- Recommended commands
- Semantic roles for files/folders
- Features detected from the structure
- Warnings if detection is uncertain

---

# 3. Required Final Template Schema

Create the template output using this general structure:

```ts
export type ProjectTemplate = {
  id: string;
  name: string;
  description?: string;

  sourceProjectPath?: string;

  stackDetection: StackDetectionResult;

  structure: {
    files: FileNode[];
    folders: FolderNode[];
    tree?: TreeNode[];
  };

  features: string[];
  tags: string[];

  metadata: {
    createdAt: string;
    updatedAt?: string;
    fileCount: number;
    folderCount: number;
    selectedItemCount: number;
    originalFileCount?: number;
  };
};
````

---

# 4. File and Folder Node Schema

Every file and folder must have a `path`.

Do not rely only on nested tree children.

```
exporttypeFileNode= {
  id:string;
  name:string;
  path:string;

  type:"file";

  extension:string;
  size?:number;

  role?:FileRole;

  includeContent:boolean;
  content?:string;

  isBinary:boolean;
  locked?:boolean;
  source?:"imported"|"custom"|"generated";
};

exporttypeFolderNode= {
  id:string;
  name:string;
  path:string;

  type:"folder";

  role?:FolderRole;

  locked?:boolean;
  source?:"imported"|"custom"|"generated";
};

exporttypeTreeNode=FileNode| (FolderNode& { children:TreeNode[] });
```

---

# 5. File and Folder Roles

Use these role types:

```
exporttypeFileRole=
|"entry-point"
|"config"
|"api"
|"ui"
|"hook"
|"type"
|"asset"
|"style"
|"state"
|"navigation"
|"service"
|"unknown";

exporttypeFolderRole=
|"ui-layer"
|"data-layer"
|"shared-ui"
|"static"
|"types"
|"navigation"
|"state"
|"services"
|"config"
|"unknown";
```

---

# 6. Import Requirements

When importing a project:

1. Recursively scan the selected project directory.
2. Ignore unnecessary folders by default.
3. Build a full project tree.
4. Let the user select/deselect files and folders.
5. Save only the selected files/folders into the template JSON.
6. Normalize the selected structure into flat `files[]` and `folders[]`.
7. Optionally keep `tree[]` for UI display.
8. Add stack detection.
9. Add command detection.
10. Add features/tags.

---

# 7. Default Ignored Folders and Files

Exclude these by default:

```
node_modules
.git
dist
build
.next
.expo
.turbo
.vercel
coverage
.DS_Store
.env
.env.local
.env.production
.env.development
```

Environment files should not be stored by default because they may contain secrets.

If the user wants to include `.env` files, warn them before saving.

---

# 8. Content Storage Rules

The snapshot should only store file content when safe.

## Include Content For

```
.ts
.tsx
.js
.jsx
.json
.md
.css
.scss
.html
.yml
.yaml
```

## Do Not Include Content For

```
.png
.jpg
.jpeg
.svg if too large
.gif
.webp
.ttf
.otf
.woff
.woff2
.pdf
.zip
.exe
.dmg
```

## Size Rule

If file size is greater than `50KB`, do not store content.

```
if (file.size>50*1024) {
includeContent=false;
}
```

For binary files:

```
includeContent=false;
content=undefined;
isBinary=true;
```

For safe small text files:

```
includeContent=true;
content=fileContent;
isBinary=false;
```

---

# 9. Structure Normalization Requirement

The app may keep a nested tree for UI display, but the saved template must also contain flat lists.

Example:

```
structure: {
files: [
    {
      name:"api-config.ts",
      path:"api/api-config.ts",
      type:"file"
    }
  ],
folders: [
    {
      name:"api",
      path:"api",
      type:"folder"
    }
  ],
tree: []
}
```

Reason:

- Easier to rebuild project
- Easier to diff templates
- Easier for AI to understand
- Easier to search by path
- Easier to validate missing files

---

# 10. Semantic Role Detection

Assign roles automatically based on path and filename.

## Folder Role Rules

```
if (path.includes("api"))role="data-layer";
elseif (path.includes("components"))role="shared-ui";
elseif (path==="app"||path.startsWith("app/"))role="ui-layer";
elseif (path==="src"||path.startsWith("src/"))role="ui-layer";
elseif (path.includes("assets"))role="static";
elseif (path.includes("types")||path.includes("@types"))role="types";
elseif (path.includes("navigation")||path.includes("router"))role="navigation";
elseif (path.includes("store")||path.includes("jotai")||path.includes("redux"))role="state";
elseif (path.includes("services"))role="services";
elseif (path.includes("config"))role="config";
elserole="unknown";
```

## File Role Rules

```
if (name==="index.tsx"||name==="index.jsx")role="entry-point";
elseif (name==="_layout.tsx")role="entry-point";
elseif (name.includes("config"))role="config";
elseif (path.includes("api"))role="api";
elseif (path.includes("hooks")||name.startsWith("use"))role="hook";
elseif (path.includes("types")||extension===".d.ts")role="type";
elseif (path.includes("components"))role="ui";
elseif (path.includes("assets"))role="asset";
elseif (path.includes("navigation")||path.includes("router"))role="navigation";
elseif (path.includes("store")||path.includes("jotai")||path.includes("redux"))role="state";
elseif (path.includes("services"))role="service";
elseif (extension===".css"||extension===".scss")role="style";
elserole="unknown";
```

---

# 11. Feature Detection

Detect project features from selected files/folders.

```
constfeatures:string[]= [];

if (hasFolder("api"))features.push("api-layer");
if (hasFolder("components"))features.push("component-based-ui");
if (hasFolder("app/(tabs)")||hasPathContaining("(tabs)"))features.push("tab-navigation");
if (hasPathContaining("auth"))features.push("authentication");
if (hasPathContaining("claim"))features.push("claim-module");
if (hasPathContaining("policy"))features.push("policy-module");
if (hasPathContaining("payment"))features.push("payment-module");
if (hasPathContaining("i18n")||hasPathContaining("translation"))features.push("localization");
if (hasPathContaining("jotai"))features.push("jotai-state-management");
if (hasPathContaining("redux"))features.push("redux-state-management");
if (hasPathContaining("tailwind"))features.push("tailwind-css");
```

Do not duplicate features.

---

# 12. Stack Detection Brain

## 12.1 Goal

Create a stack detection module that detects:

- React Vite
- Next.js
- Create React App
- Expo React Native
- React Native CLI
- Electron
- Node API
- Unknown

The detector must also detect:

- Package manager
- Commands
- Confidence score
- Reasons
- Warnings

---

# 13. Stack Detection Types

```
exporttypeProjectStack=
|"react-vite"
|"react-next"
|"react-cra"
|"react-unknown"
|"react-native-expo"
|"react-native-cli"
|"node-api"
|"electron"
|"unknown";

exporttypePackageManager="npm"|"yarn"|"pnpm"|"bun"|"unknown";

exporttypeStackDetectionResult= {
  stack:ProjectStack;

  framework:
|"react"
|"react-native"
|"node"
|"electron"
|"unknown";

  metaFramework:
|"vite"
|"nextjs"
|"expo"
|"react-native-cli"
|"cra"
|"express"
|"electron"
|"unknown";

  packageManager:PackageManager;

  commands: {
    install:string;
    dev?:string;
    start?:string;
    build?:string;
    preview?:string;
    test?:string;
    lint?:string;
    android?:string;
    ios?:string;
    web?:string;
  };

  confidence:number;
  reasons:string[];
  warnings:string[];
};
```

---

# 14. Detection Priority

The detector must follow this order:

```
1. Read package.json
2. Detect package manager from lock files
3. Detect framework from dependencies
4. Detect framework from config files
5. Detect available scripts from package.json
6. Generate recommended commands
7. Return confidence, reasons, and warnings
```

Do not guess without evidence.

---

# 15. Files and Folders to Check

Check these in the imported project root:

```
package.json

package-lock.json
yarn.lock
pnpm-lock.yaml
bun.lockb
bun.lock

vite.config.js
vite.config.ts
vite.config.mjs

next.config.js
next.config.ts
next.config.mjs

app.json
app.config.js
app.config.ts
expo-env.d.ts

android/
ios/

metro.config.js
babel.config.js

src/
app/
pages/

electron/
main.js
main.ts
electron-builder.json
```

---

# 16. Package Manager Detection

Detect package manager by lock file.

```
if (hasFile("pnpm-lock.yaml"))packageManager="pnpm";
elseif (hasFile("yarn.lock"))packageManager="yarn";
elseif (hasFile("bun.lockb")||hasFile("bun.lock"))packageManager="bun";
elseif (hasFile("package-lock.json"))packageManager="npm";
else {
packageManager="npm";
warnings.push("No lock file found. Defaulted to npm.");
}
```

Install command:

```
npm  =>"npm install"
yarn =>"yarn install"
pnpm =>"pnpm install"
bun  =>"bun install"
```

---

# 17. Package JSON Reading

Read `package.json` safely.

Requirements:

- If missing, return unknown stack.
- If invalid JSON, return unknown stack with warning.
- Never crash the app.
- Do not execute anything.
- Only read files.

Helper:

```
functionhasDependency(name:string):boolean {
returnBoolean(
packageJson.dependencies?.[name]||
packageJson.devDependencies?.[name]
  );
}

functionhasScript(name:string):boolean {
returnBoolean(packageJson.scripts?.[name]);
}
```

---

# 18. Command Helpers

Create these helper functions.

```
functionrunScriptCommand(pm:PackageManager,script:string):string {
switch (pm) {
case"npm":
return`npm run${script}`;
case"yarn":
return`yarn${script}`;
case"pnpm":
return`pnpm${script}`;
case"bun":
return`bun run${script}`;
default:
return`npm run${script}`;
  }
}

functioninstallCommand(pm:PackageManager):string {
switch (pm) {
case"npm":
return"npm install";
case"yarn":
return"yarn install";
case"pnpm":
return"pnpm install";
case"bun":
return"bun install";
default:
return"npm install";
  }
}

functionrunnerCommand(pm:PackageManager):string {
switch (pm) {
case"npm":
return"npx";
case"yarn":
return"yarn";
case"pnpm":
return"pnpm";
case"bun":
return"bunx";
default:
return"npx";
  }
}
```

---

# 19. Command Generation Rule

Always prefer package.json scripts.

Example:

```
{
  "scripts": {
    "dev":"vite --host 0.0.0.0",
    "build":"tsc && vite build"
  }
}
```

Generated commands must be:

```
dev:"npm run dev"
build:"npm run build"
```

Do not replace them with:

```
dev:"npx vite"
build:"npx vite build"
```

Reason:

Package scripts may contain important flags or custom behavior.

---

# 20. Stack Detection Rules

## 20.1 Expo React Native

Detect as `react-native-expo` when any of these are true:

```
hasDependency("expo")
hasFile("app.json")
hasFile("app.config.js")
hasFile("app.config.ts")
hasFile("expo-env.d.ts")
```

Extra evidence:

```
hasDependency("expo-router")
hasDependency("react-native")
hasFile("metro.config.js")
```

Return:

```
stack:"react-native-expo"
framework:"react-native"
metaFramework:"expo"
confidence:0.95ifexpo dependency exists
confidence:0.85ifonly app.json/app.configexists
```

Recommended commands:

```
install:"<pm> install"
dev:"<runner> expo start"
start:"<runner> expo start"
android:"<runner> expo start --android"
ios:"<runner> expo start --ios"
web:"<runner> expo start --web"
```

But if package scripts exist, prefer scripts:

```
start:"<pm run start>"
android:"<pm run android>"
ios:"<pm run ios>"
web:"<pm run web>"
```

Example:

```
{
  "scripts": {
    "start":"expo start",
    "android":"expo start --android",
    "ios":"expo start --ios",
    "web":"expo start --web"
  }
}
```

For npm:

```
start:"npm run start"
android:"npm run android"
ios:"npm run ios"
web:"npm run web"
```

---

## 20.2 React Native CLI

Detect as `react-native-cli` when:

```
hasDependency("react-native")===true
hasDependency("expo")===false
```

Extra evidence:

```
hasFolder("android")
hasFolder("ios")
hasFile("metro.config.js")
```

Return:

```
stack:"react-native-cli"
framework:"react-native"
metaFramework:"react-native-cli"
confidence:0.9ifreact-native dependency+android/ios folders exist
confidence:0.75ifonly react-native dependency exists
```

Recommended commands:

```
install:"<pm> install"
start:"<pm run start>"ifscript exists
android:"<pm run android>"ifscript exists,otherwise"<runner> react-native run-android"
ios:"<pm run ios>"ifscript exists,otherwise"<runner> react-native run-ios"
```

---

## 20.3 Next.js React App

Detect as `react-next` when any of these are true:

```
hasDependency("next")
hasFile("next.config.js")
hasFile("next.config.ts")
hasFile("next.config.mjs")
```

Extra evidence:

```
hasFolder("app")
hasFolder("pages")
hasDependency("react")
hasDependency("react-dom")
```

Return:

```
stack:"react-next"
framework:"react"
metaFramework:"nextjs"
confidence:0.95ifnext dependency exists
confidence:0.85ifonly next config exists
```

Recommended commands:

```
install:"<pm> install"
dev:"<pm run dev>"ifscript exists,otherwise"<runner> next dev"
build:"<pm run build>"ifscript exists,otherwise"<runner> next build"
start:"<pm run start>"ifscript exists,otherwise"<runner> next start"
lint:"<pm run lint>"ifscript exists
test:"<pm run test>"ifscript exists
```

---

## 20.4 Vite React App

Detect as `react-vite` when any of these are true:

```
hasDependency("vite")
hasFile("vite.config.js")
hasFile("vite.config.ts")
hasFile("vite.config.mjs")
```

Extra evidence:

```
hasDependency("@vitejs/plugin-react")
hasDependency("react")
hasDependency("react-dom")
hasFile("index.html")
```

Return:

```
stack:"react-vite"
framework:"react"
metaFramework:"vite"
confidence:0.95ifvite dependency exists
confidence:0.85ifonly vite config exists
```

Recommended commands:

```
install:"<pm> install"
dev:"<pm run dev>"ifscript exists,otherwise"<runner> vite"
build:"<pm run build>"ifscript exists,otherwise"<runner> vite build"
preview:"<pm run preview>"ifscript exists,otherwise"<runner> vite preview"
test:"<pm run test>"ifscript exists
lint:"<pm run lint>"ifscript exists
```

---

## 20.5 Create React App

Detect as `react-cra` when:

```
hasDependency("react-scripts")
```

Return:

```
stack:"react-cra"
framework:"react"
metaFramework:"cra"
confidence:0.95
```

Recommended commands:

```
install:"<pm> install"
dev:"<pm run start>"
start:"<pm run start>"
build:"<pm run build>"
test:"<pm run test>"
```

---

## 20.6 Electron App

Detect as `electron` when any of these are true:

```
hasDependency("electron")
hasDependency("electron-builder")
hasDependency("electron-forge")
hasFolder("electron")
hasFile("electron-builder.json")
packageJson.mainincludes"electron"or"main"
```

Important:

Electron may exist together with React/Vite.

If Electron is detected together with Vite/React, classify the main stack as:

```
stack:"electron"
framework:"electron"
metaFramework:"electron"
```

But include frontend evidence in reasons:

```
Electron detected with Vite frontend.
```

Recommended commands:

Use package.json scripts first.

Common script names to detect:

```
dev
start
electron
electron:dev
build
dist
make
package
```

Fallback:

```
dev:"<pm run dev>"ifexists
start:"<pm run start>"ifexists
build:"<pm run build>"ifexists
```

Do not invent an Electron command if no script exists.

Add warning:

```
Electron detected but no clear start/dev script found.
```

---

## 20.7 Node API

Detect as `node-api` when any of these are true:

```
hasDependency("express")
hasDependency("fastify")
hasDependency("nestjs")
hasDependency("@nestjs/core")
hasDependency("koa")
```

Return:

```
stack:"node-api"
framework:"node"
metaFramework:"express"|"unknown"
```

Recommended commands:

```
install:"<pm> install"
dev:"<pm run dev>"ifscript exists
start:"<pm run start>"ifscript exists
build:"<pm run build>"ifscript exists
test:"<pm run test>"ifscript exists
```

If no start/dev script exists, add warning:

```
Node API detected but no dev/start script found.
```

---

## 20.8 Plain React Unknown

Detect as `react-unknown` when:

```
hasDependency("react")
hasDependency("react-dom")
!hasDependency("vite")
!hasDependency("next")
!hasDependency("react-scripts")
```

Return:

```
stack:"react-unknown"
framework:"react"
metaFramework:"unknown"
confidence:0.65
```

Warning:

```
React detected, but no known meta-framework was found.
```

---

## 20.9 Unknown Project

If no known stack is detected:

```
stack:"unknown"
framework:"unknown"
metaFramework:"unknown"
confidence:0.1
```

Warnings:

```
Could not determine stack confidently.
No recognized framework dependency or config file found.
```

Commands:

```
install:"<pm> install"
```

---

# 21. Conflict Handling

Some projects may match multiple stacks.

Use this priority:

```
1. Electron
2. Expo React Native
3. React Native CLI
4. Next.js
5. Vite
6. Create React App
7. Node API
8. React Unknown
9. Unknown
```

Reason:

- Electron can wrap Vite/React.
- Expo includes React Native.
- Next/Vite both include React.
- CRA is older but easy to identify.
- Unknown must always be last.

If multiple indicators are detected, add warning:

```
Multiple stack indicators detected.
```

Also add reason:

```
Multiple indicators found: electron + vite. Classified as electron because desktop wrapper has highest priority.
```

---

# 22. Warning Rules

Add warnings for these cases:

```
No package.json found.
Invalid package.json.
No lock file found. Defaulted to npm.
Detected React but no dev/start script found.
Detected Expo but no expo start script found.
Detected Electron but no desktop start/dev script found.
Multiple stack indicators detected.
Could not determine stack confidently.
Environment files were excluded for safety.
Some large files were skipped from content storage.
Binary files were stored as references only.
```

---

# 23. Example Stack Detection Outputs

## Expo Project

```
{
  "stack":"react-native-expo",
  "framework":"react-native",
  "metaFramework":"expo",
  "packageManager":"npm",
  "commands": {
    "install":"npm install",
    "start":"npm run start",
    "android":"npm run android",
    "ios":"npm run ios",
    "web":"npm run web"
  },
  "confidence":0.95,
  "reasons": [
"expo dependency found",
"react-native dependency found",
"app.json exists"
  ],
  "warnings": []
}
```

---

## Vite Project

```
{
  "stack":"react-vite",
  "framework":"react",
  "metaFramework":"vite",
  "packageManager":"pnpm",
  "commands": {
    "install":"pnpm install",
    "dev":"pnpm dev",
    "build":"pnpm build",
    "preview":"pnpm preview"
  },
  "confidence":0.95,
  "reasons": [
"vite dependency found",
"vite.config.ts exists",
"react dependency found"
  ],
  "warnings": []
}
```

---

## Next.js Project

```
{
  "stack":"react-next",
  "framework":"react",
  "metaFramework":"nextjs",
  "packageManager":"npm",
  "commands": {
    "install":"npm install",
    "dev":"npm run dev",
    "build":"npm run build",
    "start":"npm run start",
    "lint":"npm run lint"
  },
  "confidence":0.95,
  "reasons": [
"next dependency found",
"next.config.mjs exists",
"app folder exists"
  ],
  "warnings": []
}
```

---

## Electron + Vite Project

```
{
  "stack":"electron",
  "framework":"electron",
  "metaFramework":"electron",
  "packageManager":"npm",
  "commands": {
    "install":"npm install",
    "dev":"npm run dev",
    "build":"npm run build"
  },
  "confidence":0.95,
  "reasons": [
"electron dependency found",
"vite dependency also found",
"Classified as electron because desktop wrapper has highest priority"
  ],
  "warnings": [
"Multiple stack indicators detected."
  ]
}
```

---

## Unknown Project

```
{
  "stack":"unknown",
  "framework":"unknown",
  "metaFramework":"unknown",
  "packageManager":"npm",
  "commands": {
    "install":"npm install"
  },
  "confidence":0.1,
  "reasons": [],
  "warnings": [
"Could not determine stack confidently.",
"No recognized framework dependency or config file found."
  ]
}
```

---

# 24. Suggested Folder Structure

Create the stack detector like this:

```
src/core/template-engine/
  import-project.ts
  normalize-structure.ts
  detect-file-role.ts
  detect-folder-role.ts
  detect-features.ts
  save-template.ts
  types.ts

src/core/stack-detector/
  detect-stack.ts
  command-builder.ts
  file-detector.ts
  package-json-reader.ts
  package-manager-detector.ts
  types.ts
```

---

# 25. File Responsibilities

## `types.ts`

Contains shared types:

```
ProjectTemplate
FileNode
FolderNode
TreeNode
StackDetectionResult
ProjectStack
PackageManager
FileRole
FolderRole
```

## `import-project.ts`

Responsible for:

```
Scanning selected project folder
Ignoring default ignored folders
Building raw tree
Reading file metadata
```

## `normalize-structure.ts`

Responsible for:

```
Converting selected tree into files[] and folders[]
Ensuring every item has a relative path
```

## `detect-file-role.ts`

Responsible for:

```
Assigning file semantic role
```

## `detect-folder-role.ts`

Responsible for:

```
Assigning folder semantic role
```

## `detect-features.ts`

Responsible for:

```
Detecting features from selected paths
```

## `detect-stack.ts`

Responsible for:

```
Main stack detection brain
```

## `command-builder.ts`

Responsible for:

```
Building install/dev/start/build/test/lint commands
Always preferring package.json scripts
```

## `file-detector.ts`

Responsible for:

```
hasFile
hasFolder
hasPathContaining
```

## `package-json-reader.ts`

Responsible for:

```
Safely reading package.json
Handling missing or invalid package.json
```

## `package-manager-detector.ts`

Responsible for:

```
Detecting npm/yarn/pnpm/bun from lock files
```

---

# 26. Main Function Signatures

Implement these functions:

```
exportasyncfunctionimportProject(projectRoot:string):Promise<TreeNode[]>;
```

```
exportfunctionnormalizeStructure(tree:TreeNode[]): {
  files:FileNode[];
  folders:FolderNode[];
};
```

```
exportasyncfunctiondetectProjectStack(
projectRoot:string
):Promise<StackDetectionResult>;
```

```
exportfunctiondetectFeatures(files:FileNode[],folders:FolderNode[]):string[];
```

```
exportasyncfunctioncreateProjectTemplate(params: {
  projectRoot:string;
  selectedTree:TreeNode[];
  name:string;
  description?:string;
}):Promise<ProjectTemplate>;
```

---

# 27. Main Flow

The final import flow should be:

```
1. User selects project folder
2. App scans project folder
3. App shows full file tree
4. User selects useful folders/files
5. App normalizes selected tree
6. App detects file/folder roles
7. App detects stack
8. App detects package manager
9. App detects commands
10. App detects features
11. App saves final template JSON
```

---

# 28. Safety Requirements

The detector and importer must follow these rules:

```
Do not execute commands.
Do not install packages.
Do not modify imported project.
Do not delete files.
Do not write into imported project.
Only read files.
Handle missing files safely.
Handle permission errors safely.
Skip binary content.
Skip large file content.
Exclude environment files by default.
Return warnings instead of crashing.
```

---

# 29. Template Validation

Add a validation function:

```
exportfunctionvalidateTemplate(template:ProjectTemplate): {
  valid:boolean;
  errors:string[];
  warnings:string[];
};
```

Validation should check:

```
Template has id
Template has name
Template has stackDetection
Every file has path
Every folder has path
File count matches metadata
No binary file has content
No file over size limit has content
Commands include install
Unknown stack has warning
```

---

# 30. Project Generation From Template

Later, add:

```
exportasyncfunctiongenerateProjectFromTemplate(params: {
  template:ProjectTemplate;
  outputPath:string;
  projectName:string;
}):Promise<void>;
```

Generation rules:

```
Create folders first
Create files second
Only create content for files with includeContent = true
For files without content, create empty placeholder or skip based on user option
Never overwrite existing folder without confirmation
Replace template variables if supported
```

Possible template variables:

```
{{PROJECT_NAME}}
{{APP_NAME}}
{{PACKAGE_NAME}}
{{API_URL}}
```

---

# 31. Acceptance Criteria

The feature is complete when:

```
User can import a project folder
User can select only needed files/folders
Selected structure is saved as JSON
Every file has a relative path
Every folder has a relative path
Binary files do not store content
Large files do not store content
Stack detection works for Expo
Stack detection works for React Native CLI
Stack detection works for Vite React
Stack detection works for Next.js
Stack detection works for CRA
Stack detection works for Electron
Stack detection works for Node API
Unknown projects return unknown safely
Package manager is detected from lock files
Commands are generated from package scripts first
Fallback commands are only used when safe
Detection returns confidence
Detection returns reasons
Detection returns warnings
Template validation exists
No command is executed during detection
Imported project is never modified
```

---

# 32. Final Agent Instruction

Build this system as a safe, read-only project intelligence engine.

Do not treat the import result as a simple file dump.

The imported template must understand:

```
What files exist
Where files belong
What role files have
What framework the project uses
What package manager it uses
What commands should run it
What warnings exist
How confident the system is
```

The goal is to make every saved template reusable, explainable, and ready for future AI-assisted project generation.
