# 提醒事项 (Reminders)

一款复刻 Apple 风格的提醒事项桌面应用，使用 Rust + Tauri + React 构建。

## 技术栈

- **后端**: Rust + Tauri
- **数据库**: SQLite (rusqlite)
- **前端**: React + TypeScript + Tailwind CSS + Vite

## 环境要求

- Rust 1.77+
- Node.js 18+
- npm / yarn

## 安装依赖

```bash
# 安装前端依赖
npm install

# 安装 Tauri CLI (如果未安装)
cargo install tauri-cli
```

## 开发模式运行

```bash
# 进入项目目录
cd reminders

# 启动开发服务器
cargo tauri dev
```

开发模式会同时启动：
- Vite 开发服务器 (http://localhost:5173)
- Tauri 桌面应用

## 构建生产版本

```bash
# 构建前端
npm run build

# 构建桌面应用
cargo tauri build
```

构建完成后，可执行文件位于：
- Windows: `src-tauri/target/release/reminders.exe`
- macOS: `src-tauri/target/release/bundle/macos/Reminders.app`
- Linux: `src-tauri/target/release/reminders`

## 项目结构

```
reminders/
├── src/                    # 前端代码
│   ├── components/         # React 组件
│   │   ├── Header.tsx      # 顶部导航栏
│   │   ├── Sidebar.tsx     # 侧边栏
│   │   ├── ReminderList.tsx # 提醒列表
│   │   ├── CalendarView.tsx # 日历视图
│   │   └── AddReminderModal.tsx # 添加提醒模态框
│   ├── hooks/              # 自定义 Hooks
│   │   └── useApi.ts       # Tauri API 调用 Hook
│   ├── types/              # TypeScript 类型定义
│   │   └── api.ts          # API 响应类型
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 入口文件
│   └── index.css           # 全局样式
├── src-tauri/              # Tauri 后端代码
│   ├── src/
│   │   ├── commands.rs     # Tauri 命令定义
│   │   ├── database/       # 数据库相关
│   │   │   ├── connection.rs # 数据库连接
│   │   │   ├── schema.rs   # 数据库 schema
│   │   │   └── mod.rs
│   │   ├── models/         # 数据模型
│   │   │   ├── reminder.rs # 提醒模型
│   │   │   ├── owner.rs    # 负责人模型
│   │   │   └── mod.rs
│   │   └── main.rs         # 应用入口
│   ├── Cargo.toml          # Rust 依赖配置
│   └── tauri.conf.json     # Tauri 配置
├── index.html              # HTML 模板
├── package.json            # 前端依赖配置
├── tailwind.config.js      # Tailwind CSS 配置
└── vite.config.ts          # Vite 配置
```

## 功能特性

- ✅ 提醒事项列表管理
- ✅ 添加/编辑/删除提醒
- ✅ 标记完成/未完成
- ✅ 日期和时间设置
- ✅ 优先级设置
- ✅ 分类列表管理
- ✅ 负责人管理
- ✅ 日历视图
- ✅ 快速筛选（今日、计划、逾期、已完成）

## 快捷键

- `Ctrl + N`: 添加新提醒
- `Ctrl + F`: 搜索提醒

## License

MIT
