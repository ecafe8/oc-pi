---
applyTo: '**'
---

# Project general coding standards

- 使用 TypeScript 语言
- 使用 ES6 语法
- 使用 async/await 语法
- 使用模块化编程
- 使用函数式编程
- 使用面向对象编程
- 使用单一职责原则
- 使用别名路径引用，避免使用相对路径
- 命名方式：
  - 使用 文件夹 + index.ts|tsx 创建并命名文件：`[功能模块名]/index.ts`
  - 使用 kebab-case 命名法，例如：`file-api/index.ts`
  - 使用 kebab-case 命名组件，例如：`custom-component/index.tsx`
  - 使用 PascalCase 命名类和接口，例如：`class UserProfile {}`
  - 使用 camelCase 命名变量和函数，例如：`const userName = 'Alice'; function getUserName() {}`

## Naming Conventions

- Use kebab-case for file and folder names
- Use PascalCase for component names, interfaces, and type aliases
- Use camelCase for dir names, variables, functions, and methods
- Prefix private class members with underscore (\_)
- Use ALL_CAPS for constants

## Error Handling

- Use try/catch blocks for async operations
- Implement proper error boundaries in React components
- Always log errors with contextual information

## TypeScript Guidelines

- Use TypeScript for all new code
- Follow functional programming principles where possible
- Use interfaces for data structures and type definitions
- Prefer immutable data (const, readonly)
- Use optional chaining (?.) and nullish coalescing (??) operators
- All functions need to define input parameter types and return value types
- Use `unknown` instead of `any` for unknown types
- Use `never` for functions that never return (e.g., throw an error)
- Use `void` for functions that do not return a value
- Use `Promise<void>` for async functions that do not return a value

## 文件目录

 - docs/: 项目相关文档，所有文档都应该存放在此目录下，文档包括但不限于：
   - 产品需求文档
   - 架构设计文档
   - API 接口文档
   - 规划与任务分解文档
 - apps/: 各个子应用，例如：
   - web-draft-content: 测试应用
   - web-geo: 核心创作平台
   - web-geo-api: 创作平台后端服务
   - web-portal: 官网和营销落地页
   - web-admin: 超级管理员后台
   - auth-server: 统一认证与授权服务
   - desktop-studio: 桌面端壳
 - packages/: 共享包，例如：
   - share-common: 通用工具库
   - share-ui: 通用 UI 组件库
   - share-frontend: 前端共享逻辑
   - share-backend: 后端共享逻辑
 - .github/: CI/CD workflows 配置文件
 - scripts/: 构建与脚本工具
