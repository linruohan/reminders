# 提醒事项 (Reminders)

复刻 Apple 风格的桌面提醒与日历应用。当前版本 **0.2.0**。

## 技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Tauri 2（无边框透明窗口、系统托盘、`tauri-plugin-notification`） |
| 前端 | React 18 + TypeScript（strict）+ Vite + Tailwind CSS（`apple-*` 设计 token） |
| 后端 | Rust：`commands/` + Repository + SQLite（rusqlite `bundled`，无需系统 SQLite） |

## 环境要求

- Rust 1.85+（`src-tauri/Cargo.toml` 中 `rust-version = "1.85"`，edition 2024）
- Node.js 18+
- npm

Windows 生产构建使用目标 `x86_64-pc-windows-msvc`。

## 安装与运行

```bash
npm install
cargo install tauri-cli   # 若尚未安装
cargo tauri dev
```

开发模式会同时启动：

- Vite 开发服务器：http://localhost:5173
- Tauri 桌面窗口

仅跑前端（无后端 / 无 SQLite / `invoke` 不可用）：

```bash
npm run dev
```

## 构建

```bash
npm run build              # tsc 类型检查 + vite 打包到 dist/
cargo tauri build          # 生产桌面安装包
npm run build:windows      # 前端 + Windows MSVC 生产包
npm run build:dev          # 前端 + Windows MSVC debug 包
```

本地脚本（PowerShell）：

```powershell
.\scripts\build-windows.ps1 -Branch develop -Version 0.1.0 -Environment development
```

产物位置（`cargo tauri build` 默认）：

- Windows：`src-tauri/target/release/reminders.exe` 及 `src-tauri/target/release/bundle/`
- macOS / Linux：对应 `bundle/` 目录

## 功能

与当前代码一致，未实现的能力不列入。

### 提醒事项

- 智能筛选：今天（逾期未完成 + 当日截止）、计划（未来有截止日期）、全部、旗标、紧急（高优先级未完成）、已完成
- 我的列表：新建 / 编辑名称·图标·颜色 / 右键删除；新建提醒时默认继承当前列表
- 负责人：侧栏筛选与增删改；新建、内联编辑、日历编辑、详情均可指定；列表项展示负责人名
- 标签：输入添加、联想已有标签、侧栏按标签筛选、右键重命名或删除
- 增删改提醒：标题、备注、URL、截止日期/时间、全天、旗标、优先级、所属列表、负责人、重复、提前提醒、标签
- 父子提醒：内联编辑可新建子提醒（继承列表、负责人、截止）；列表按层级缩进；删除父任务会级联删除子提醒（确认框会写明数量）
- 子任务：挂在单条提醒下的轻量清单；列表只读勾选；编辑 / 详情可增删改
- 完成 / 未完成；「今天」按已过期 / 未过期分组；「计划」按截止日期分组
- 搜索：对已加载数据做本地过滤（标题、备注、URL、标签），`Ctrl+F` / `⌘F` 聚焦侧栏搜索框
- 右键菜单：完成、简介、删除、明天到期、移到列表、优先级、剪切 / 拷贝 / 粘贴
- 剪切：改所属列表（含子提醒），不复制、不删原记录
- 拷贝粘贴：新建一条，保留父任务关系并复制子任务
- 列表较长时虚拟化滚动（分组视图与编辑中除外）

### 日历

- 日 / 周 / 月 / 年视图；按可见日期范围在前端过滤有截止日期的提醒
- 日 / 周：0–23 时间轴；双击时间轴预填时刻新建；双击全天行预填全天新建
- 日视图：顶部周条可点选日期；全天事项可拖到周条其它日改期
- 月：单击进入日视图；双击空白格预填当天全天新建
- 年：十二个月缩略图，有提醒的日期打点；点击某月进入月视图
- 改期：有时事件拖拽（15 分钟吸附）；全天 / 周全天 / 月视图拖到其它日
- 搜索抽屉：同样是本地标题 / 备注 / URL / 标签过滤

### 重复与通知

- 重复：每天 / 每周 / 每 2 周 / 每月 / 每年 / 自定义（天及以上）；可选结束重复日期
- 完成带重复的提醒时，后端生成下一次实例（继承标签、负责人、父任务；子任务复制为未完成）
- 提前提醒：1 天 / 2 天 / 1 周 / 2 周 / 1 个月前，或自定义（分 / 时 / 天 / 周 / 月）
- 系统通知：每 20 秒轮询未完成项；若设置了提前提醒，提前时刻与到期时刻各弹一次（正文含截止时间）；启动时补扫一次；去重窗口约 10 分钟
- 关闭窗口 / Alt+F4：隐藏到托盘，进程继续跑以便收通知；彻底退出需托盘菜单「退出」
- 托盘：左键显示窗口；菜单「显示窗口 / 隐藏窗口 / 退出」

### 其它界面

- 标题栏：红绿灯（关闭=隐藏到托盘、最小化、最大化）；「提醒事项 / 日历」切换；亮色 / 暗色（`localStorage` 键 `reminders-theme`）
- Toast 操作反馈；删除提醒二次确认
- 每 60 秒刷新「今天」日期边界（编辑中不刷新）
- 窗口：800×660、可缩放、无边框、透明背景

## 快捷键

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+N` / `⌘N` | 打开新建提醒 |
| `Ctrl+F` / `⌘F` | 提醒事项：聚焦侧栏搜索；日历：打开搜索抽屉 |
| `Esc` | 取消内联编辑 / 关闭部分弹层 |

## 数据

- 数据库文件：系统应用数据目录下的 `reminders.db`（首次启动自动建表并写入示例列表、负责人、提醒）
- 所有 ID 为 UUID v4 字符串
- `created_date` / `created_time`：记录创建戳（不可由用户改）
- `end_date` / `end_time`：用户截止日期，驱动今天 / 计划 / 日历 / 通知
- 今天视图包含逾期未完成项；无截止日期的项不进入今天 / 计划

## 项目结构

```
reminders/
├── src/                         # React 前端（@/ → src/）
│   ├── main.tsx                 # 入口
│   ├── App.tsx                  # 视图切换、弹窗、Toast、数据钩子
│   ├── api.ts                   # Tauri invoke 封装
│   ├── pages/
│   │   ├── ReminderPage.tsx
│   │   └── CalendarPage.tsx
│   ├── components/
│   │   ├── TitleBar.tsx
│   │   ├── Sidebar.tsx
│   │   ├── ReminderList.tsx / ReminderItem.tsx
│   │   ├── reminder/            # 表单字段、内联编辑、子任务、下拉
│   │   ├── calendar/            # 日/周/月/年、搜索抽屉、编辑卡片
│   │   └── AddReminderModal.tsx
│   ├── hooks/
│   │   ├── useReminderData.ts   # 数据层 / 缓存 / 筛选
│   │   ├── useTheme.ts
│   │   └── useVirtualList.ts
│   ├── types/api.ts
│   └── utils/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands/            # reminders / lists / owners / tags / subtasks
│   │   ├── repository/
│   │   ├── database/            # schema + connection
│   │   ├── notification_scheduler.rs
│   │   ├── recurrence.rs
│   │   ├── tray.rs
│   │   └── logging.rs           # Windows: %LOCALAPPDATA%\reminders\run.log
│   ├── tauri.conf.json
│   └── capabilities/default.json
├── scripts/build-windows.ps1
├── package.json
└── vite.config.ts
```

## 后端命令

| 命令 | 作用 |
|------|------|
| `get_all_reminders` / `create_reminder` / `update_reminder` / `delete_reminder` / `toggle_reminder_completed` | 提醒 CRUD；列表一次性带上标签与子任务 |
| `get_all_lists` / `create_list` / `update_list` / `delete_list` | 列表 |
| `get_all_owners` / `create_owner` / `update_owner` / `delete_owner` | 负责人 |
| `get_all_tags` / `rename_tag` / `delete_tag` | 标签 |
| `create_subtask` / `update_subtask` / `delete_subtask` | 子任务（无独立 get；随提醒加载） |

前端不按日期范围向后端拉取日历数据：启动时 `get_all_reminders`，日历按 `end_date` 在本地过滤。搜索同样是前端过滤，没有 FTS 索引。

## 未包含

以下在旧文档或草案中出现过，**当前代码没有**：

- 全文检索（FTS5）或后端 `search` 命令
- `get_reminders_by_date_range`、独立 `get_subtasks`
- lint / format / 测试脚本
- 应用完全退出后的系统级定时通知（需托盘常驻）
