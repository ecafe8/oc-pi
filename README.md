# Octopus Monorepo
## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `@repo/web-template`: [Next.js](https://nextjs.org/) app
- `@repo/share-ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/share-frontend`: a stub frontend utility library shared by both `web` and `docs` applications
- `@repo/biome-config`: `biome` configurations
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

### Shared Type Import Rule

- RPC 类型通过 `@repo/server-template-exports/rpc` 使用。
- 共享模块类型通过 `import type` 从 `@repo/server-template/modules/*/types` 直接导入。
- 不再维护 `apps/server-template/exports/types.ts`。

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [Biome](https://biomejs.dev/) for code linting and formatting


### Dev

```
bun i
```
To start a development server for all apps, run the following command:

```
# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo dev
```

Or, if you prefer to use `bun` directly, you can run:
```
cd apps/test-web
bun dev
```

### Build

To build all apps and packages, run the following command:

# With [global `turbo`](https://turborepo.com/docs/getting-started/installation#global-installation) installed (recommended)
turbo build


## Best Practices

### Structure

[](https://gemini.google.com/app/f8694eb84b83f80b)

```plaintext
packages/tools/
├── src/
│   ├── index.ts              # 聚合所有工具，导出 toolRegistry
│   ├── tool-a/               # 工具 A 的完整世界
│   │   ├── schema.ts         # 定义
│   │   ├── implementation.ts # 逻辑
│   │   ├── utils.ts          # 该工具私有的辅助函数
│   │   └── index.ts          # 对外暴露该工具的组合体
│   ├── tool-b/               # 工具 B
│   │   ├── schema.ts
│   │   ├── implementation.ts
│   │   └── index.ts
│   └── common/               # 多个工具通用的基类或工具
└── package.json
```

```typescript
// packages/tools/src/index.ts
import { SearchSchema } from "./schema";
import { searchHandler } from "./implementation";

// 导出这个工具的“完整描述符”
export const searchTool = {
  name: "search",
  description: "执行网页搜索",
  schema: SearchSchema,
  execute: searchHandler
};

// 导出类型供其他 package 使用
export type { SearchInput } from "./schema";
```

```typescript
// packages/tools/src/tool-a/schema.ts
import { z } from "zod";
// 定义工具 A 的输入输出结构
export const ToolASchema = z.object({
  query: z.string().min(1, "Query cannot be empty")
});
export type ToolAInput = z.infer<typeof ToolASchema>;
```

```typescript
// packages/tools/src/index.ts
import { ToolASchema } from "./tool-a/schema";
import { ToolBSchema } from "./tool-b/schema";

// 聚合所有工具的 schema
export const toolRegistry = {
  toolA: ToolASchema,
  toolB: ToolBSchema
};

export type AvailableTools = typeof allTools[number]["name"];
```


