# 设计方案：Apple 风格提醒与日历工具

> 与当前实现对齐（Tauri 2 + React）。早期 GPUI 草案已废弃。

## 一、整体架构

```
┌─────────────────────────────────────────────────────┐
│                    TitleBar（无边框自定义）            │
│  ┌─────────────┐ ┌─────────────┐                   │
│  │   提醒事项   │ │    日历     │  ← App 视图切换      │
│  └─────────────┘ └─────────────┘                   │
├─────────────────────────────────────────────────────┤
│  ReminderPage                                       │
│  ┌──────────┬──────────────────────────────────┐   │
│  │ Sidebar  │  ReminderList（筛选 / 搜索 / 虚拟化）│   │
│  │ 智能列表  │  ReminderItem / ReminderItemEditMode│   │
│  │ 我的列表  │  AddReminderModal + ReminderFormFields│
│  │ 负责人    │                                      │
│  │ 标签      │                                      │
│  └──────────┴──────────────────────────────────┘   │
│                                                     │
│  CalendarPage → CalendarView                        │
│  ┌ 日 / 周 / 月 ┐  搜索 · 日期导航 · 今天            │
│  │ DayView / WeekView / MonthView                   │
│  │ 全天行 · 0–23 时间轴 · 拖拽改期 · 双击新建        │
│  └──────────────────────────────────────────────────┘
└─────────────────────────────────────────────────────┘
```

## 二、技术栈

| 层 | 技术 |
|----|------|
| 桌面壳 | Tauri 2（无边框、透明窗口、系统托盘） |
| 前端 | React 18 + TypeScript + Vite + Tailwind（`apple-*` 设计 token） |
| 后端 | Rust：`commands` + Repository + SQLite（rusqlite bundled） |
| 搜索 | FTS5 + LIKE 回退 |
| 通知 | `tauri-plugin-notification` + 本地调度器 + 托盘常驻 |

## 三、数据模型（要点）

- `created_date/time`：创建戳；`end_date/time`：截止（驱动今天/计划/逾期与日历）
- ID：UUID v4 字符串
- 扩展字段：全天、旗标、优先级、重复、提前提醒、负责人、标签、URL、子任务

路径：`src-tauri/src/models/`、`src/types/api.ts`

## 四、前端结构（摘要）

```
src/
├── App.tsx                 # 视图切换、Toast、数据钩子
├── pages/                  # ReminderPage / CalendarPage
├── components/
│   ├── reminder/           # FormFields、内联编辑、表单选项
│   ├── calendar/           # 日/周/月视图与编辑卡片
│   └── ...
├── hooks/                  # useApi、useReminderData、useVirtualList
└── utils/                  # reminderForm、reminderUpdates、dateUtils
```

后端：`src-tauri/src/commands/`、`repository/`、`database/`（含 `fts.rs`）

## 五、表单与编辑

- **共享字段**：`ReminderFormFields`（新建弹窗 / 日历编辑 / 列表内联编辑）
- **校验**：`validateReminderFields`（标题、URL）
- **补丁转换**：`formFieldsToReminderPatch` → `buildUpdates` 差分提交

## 六、日历交互

| 能力 | 说明 |
|------|------|
| 视图 | 日 / 周 / 月；按可见日期范围拉取 |
| 新建 | 双击时间轴预填时刻；全天行预填全天 |
| 改期 | 有时事件拖拽（15 分钟吸附）；全天/月视图拖到其它日 |

## 七、仍待（可选产品能力）

- 可选 lint/format 脚本

## 八、托盘与通知

- 关闭窗口 / Alt+F4 → 隐藏到系统托盘（进程继续，可收通知）
- 托盘：左键显示窗口；菜单「显示 / 隐藏 / 退出」
- 到期 / 提前提醒由 `notification_scheduler` 轮询弹出 OS 通知（正文含截止时间）

## 九、子任务

- 表 `subtasks`（级联删除）；随提醒列表批量加载
- 列表只读勾选；内联编辑 / 详情可增删改
- 命令：`get_subtasks` / `create_subtask` / `update_subtask` / `delete_subtask`
