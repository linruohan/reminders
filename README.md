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
│   │   ├── TitleBar.tsx    # 顶部标题栏
│   │   ├── Sidebar.tsx     # 侧边栏
│   │   ├── ReminderList.tsx # 提醒列表
│   │   ├── calendar/       # 日历视图
│   │   └── AddReminderModal.tsx # 添加提醒模态框
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useApi.ts       # Tauri API 调用
│   │   └── useReminderData.ts # 数据层 / 缓存
│   ├── types/              # TypeScript 类型定义
│   │   └── api.ts          # API 响应类型
│   ├── App.tsx             # 主应用组件
│   ├── main.tsx            # 入口文件
│   └── index.css           # 全局样式
├── src-tauri/              # Tauri 后端代码
│   ├── src/
│   │   ├── commands.rs     # Tauri 命令定义
│   │   ├── database/       # 数据库相关
│   │   ├── models/         # 数据模型
│   │   ├── repository/     # 数据访问层
│   │   └── main.rs         # 应用入口
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.ts
```

## 功能特性

- ✅ 提醒事项列表管理
- ✅ 添加/编辑/删除提醒
- ✅ 标记完成/未完成
- ✅ 截止日期和时间设置（`end_date` / `end_time`）
- ✅ 优先级设置
- ✅ 分类列表管理（右键重命名/删除）
- ✅ 负责人分配
- ✅ 日历视图
- ✅ 快速筛选（今日、计划、逾期、旗标、已完成）
- ✅ 重复提醒：完成时自动生成下一次实例
- ✅ 到期 / 提前提醒系统通知（应用运行时轮询触发；应用关闭后不会弹出）
- ⏳ 位置提醒：字段已预留，桌面端地理围栏尚未实现

## 快捷键

- `Ctrl + N`: 添加新提醒
- `Ctrl + F`: 搜索提醒

## License

MIT
