# Reminders 项目 — 未完善与可优化点

> 审查日期：2026-07-24  
> **进度**：P0 / P1 核心 / 本轮表单抽取·拖拽改期·按日期范围 均已落地

---

## 已完成摘要

| 批次 | 内容 |
|------|------|
| P0 | 完成筛选、标签保存、重复生成、通知补扫 |
| P1 | 新建继承列表、Toast、全天、负责人/标签筛选、校验 |
| 续 1 | 24h 时间轴、FTS5、列表虚拟化、共享校验 |
| 续 2 | `ReminderFormFields`、日历拖拽改期、`get_reminders_by_date_range` |

---

## 仍待（可选）

- 内联编辑 `ReminderItemEditMode` 也接入共享表单（当前仍为 chip 下拉模式）
- 全天事件拖拽改日期
- 子任务 / OS 级通知 / 托盘常驻
- 文档 `design.md` 对齐；可选 lint/format

---

## 关键新文件

- `src/components/reminder/ReminderFormFields.tsx`
- `src-tauri/src/database/fts.rs`
- `src/hooks/useVirtualList.ts`
