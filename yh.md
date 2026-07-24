# Reminders 项目 — 未完善与可优化点

> 审查日期：2026-07-24  
> **进度**：P0 / P1 / 续 1–3 均已落地

---

## 已完成摘要

| 批次 | 内容 |
|------|------|
| P0 | 完成筛选、标签保存、重复生成、通知补扫 |
| P1 | 新建继承列表、Toast、全天、负责人/标签筛选、校验 |
| 续 1 | 24h 时间轴、FTS5、列表虚拟化、共享校验 |
| 续 2 | `ReminderFormFields`、日历有时事件拖拽、`get_reminders_by_date_range` |
| 续 3 | 周/月全天拖拽改日期；内联编辑校验 + Toast；`update_on_conn` 归一 UPDATE |

---

## 仍待（可选）

- 内联编辑改用 `ReminderFormFields`（当前仍为 chip 下拉）
- 子任务 / OS 级通知 / 托盘常驻
- 文档 `design.md` 对齐；可选 lint/format

---

## 关键新文件

- `src/components/reminder/ReminderFormFields.tsx`
- `src-tauri/src/database/fts.rs`
- `src/hooks/useVirtualList.ts`
