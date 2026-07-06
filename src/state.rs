use crate::models::reminder::{AppView, Reminder, ReminderList};
use chrono::{Local, NaiveDate, Datelike};
use uuid::Uuid;

#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub enum CalendarViewMode {
    #[default]
    Day,
    Week,
    Month,
}

pub struct AppState {
    pub reminders: Vec<Reminder>,
    pub lists: Vec<ReminderList>,
    pub current_view: AppView,
    pub selected_list_id: Option<Uuid>,
    pub selected_date: Option<NaiveDate>,
    pub show_add_modal: bool,
    pub calendar_year: i32,
    pub calendar_month: u32,
    pub calendar_view_mode: CalendarViewMode,
}

impl AppState {
    pub fn new() -> Self {
        let lists = vec![
            ReminderList::new("提醒事项".to_string()),
            ReminderList::new("工作".to_string()),
            ReminderList::new("个人".to_string()),
        ];

        let mut reminders = vec![
            Reminder::new("完成项目设计".to_string()),
            Reminder::new("购买生活用品".to_string()),
            Reminder::new("参加会议".to_string()),
        ];

        if let Some(list_id) = lists.first().map(|l| l.id) {
            for reminder in &mut reminders {
                reminder.list_id = Some(list_id);
            }
        }

        let today = Local::now().date_naive();
        Self {
            reminders,
            lists,
            current_view: AppView::Reminder,
            selected_list_id: None,
            selected_date: Some(today),
            show_add_modal: false,
            calendar_year: today.year(),
            calendar_month: today.month(),
            calendar_view_mode: CalendarViewMode::Day,
        }
    }

    pub fn add_reminder(&mut self, reminder: Reminder) {
        self.reminders.push(reminder);
    }

    pub fn update_reminder(&mut self, id: Uuid, updated: Reminder) {
        if let Some(index) = self.reminders.iter().position(|r| r.id == id) {
            self.reminders[index] = updated;
        }
    }

    pub fn delete_reminder(&mut self, id: Uuid) {
        self.reminders.retain(|r| r.id != id);
    }

    pub fn add_list(&mut self, list: ReminderList) {
        self.lists.push(list);
    }

    pub fn update_list(&mut self, id: Uuid, updated: ReminderList) {
        if let Some(index) = self.lists.iter().position(|l| l.id == id) {
            self.lists[index] = updated;
        }
    }

    pub fn delete_list(&mut self, id: Uuid) {
        self.lists.retain(|l| l.id != id);
        self.reminders.retain(|r| r.list_id != Some(id));
        if self.selected_list_id == Some(id) {
            self.selected_list_id = None;
        }
    }

    pub fn set_current_view(&mut self, view: AppView) {
        self.current_view = view;
    }

    pub fn set_selected_list(&mut self, list_id: Option<Uuid>) {
        self.selected_list_id = list_id;
    }

    pub fn set_selected_date(&mut self, date: Option<NaiveDate>) {
        self.selected_date = date;
    }

    pub fn toggle_add_modal(&mut self) {
        self.show_add_modal = !self.show_add_modal;
    }

    pub fn prev_month(&mut self) {
        if self.calendar_month == 1 {
            self.calendar_month = 12;
            self.calendar_year -= 1;
        } else {
            self.calendar_month -= 1;
        }
    }

    pub fn next_month(&mut self) {
        if self.calendar_month == 12 {
            self.calendar_month = 1;
            self.calendar_year += 1;
        } else {
            self.calendar_month += 1;
        }
    }

    pub fn go_to_today(&mut self) {
        let today = Local::now().date_naive();
        self.calendar_year = today.year();
        self.calendar_month = today.month();
        self.selected_date = Some(today);
    }

    pub fn set_calendar_view_mode(&mut self, mode: CalendarViewMode) {
        self.calendar_view_mode = mode;
    }

    pub fn get_reminders_for_date(&self, date: Option<NaiveDate>) -> Vec<Reminder> {
        if let Some(d) = date {
            self.reminders.iter()
                .filter(|r| r.due_date == Some(d) && !r.is_completed)
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    pub fn has_reminder_on_date(&self, date: NaiveDate) -> bool {
        self.reminders.iter()
            .any(|r| r.due_date == Some(date) && !r.is_completed)
    }

    pub fn get_filtered_reminders(&self) -> Vec<Reminder> {
        match self.selected_list_id {
            Some(id) => self.reminders
                .iter()
                .filter(|r| r.list_id == Some(id))
                .cloned()
                .collect(),
            None => self.reminders.clone(),
        }
    }
}