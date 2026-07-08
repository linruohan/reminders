use crate::models::reminder::{Reminder, ReminderList};
use crate::state::enums::{AppView, CalendarViewMode, ReminderFilter};
use chrono::{Datelike, Local, NaiveDate};
use uuid::Uuid;

pub struct AppState {
    pub reminders: Vec<Reminder>,
    pub lists: Vec<ReminderList>,
    pub current_view: AppView,
    pub selected_list_id: Option<Uuid>,
    pub reminder_filter: ReminderFilter,
    pub selected_date: Option<NaiveDate>,
    pub show_add_modal: bool,
    pub show_event_modal: bool,
    pub selected_reminder_id: Option<Uuid>,
    pub editing_reminder_id: Option<Uuid>,
    pub show_detail_panel: bool,
    pub calendar_year: i32,
    pub calendar_month: u32,
    pub calendar_view_mode: CalendarViewMode,
}

impl AppState {
    pub fn new() -> Self {
        let today = Local::now().date_naive();
        Self {
            reminders: Vec::new(),
            lists: Vec::new(),
            current_view: AppView::Reminder,
            selected_list_id: None,
            reminder_filter: ReminderFilter::Today,
            selected_date: Some(today),
            show_add_modal: false,
            show_event_modal: false,
            selected_reminder_id: None,
            editing_reminder_id: None,
            show_detail_panel: false,
            calendar_year: today.year(),
            calendar_month: today.month(),
            calendar_view_mode: CalendarViewMode::Day,
        }
    }

    pub fn refresh_data(&mut self, reminders: Vec<Reminder>, lists: Vec<ReminderList>) {
        self.reminders = reminders;
        self.lists = lists;
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
        if self.selected_reminder_id == Some(id) {
            self.selected_reminder_id = None;
            self.show_detail_panel = false;
        }
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
        if let ReminderFilter::List(list_id) = self.reminder_filter {
            if list_id == id {
                self.reminder_filter = ReminderFilter::All;
            }
        }
    }

    pub fn search_reminders(&self, keyword: &str) -> Vec<Reminder> {
        let keyword_lower = keyword.to_lowercase();
        self.reminders
            .iter()
            .filter(|r| {
                let title_match = r.title.to_lowercase().contains(&keyword_lower);
                let desc_match = r
                    .description
                    .as_ref()
                    .map(|d| d.to_lowercase().contains(&keyword_lower))
                    .unwrap_or(false);
                let date_match = r
                    .due_date
                    .map(|d| d.format("%m月%d日").to_string().contains(&keyword_lower))
                    .unwrap_or(false);
                let time_match = r
                    .due_time
                    .map(|t| t.format("%H:%M").to_string().contains(&keyword_lower))
                    .unwrap_or(false);
                let list_name_match = r
                    .list_id
                    .and_then(|id| self.lists.iter().find(|l| l.id == id))
                    .map(|l| l.name.to_lowercase().contains(&keyword_lower))
                    .unwrap_or(false);
                title_match || desc_match || date_match || time_match || list_name_match
            })
            .cloned()
            .collect()
    }

    pub fn set_current_view(&mut self, view: AppView) {
        self.current_view = view;
    }

    pub fn set_reminder_filter(&mut self, filter: ReminderFilter) {
        self.reminder_filter = filter;
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

    pub fn set_selected_reminder(&mut self, id: Option<Uuid>) {
        self.selected_reminder_id = id;
        self.show_detail_panel = id.is_some();
    }

    pub fn toggle_event_modal(&mut self) {
        self.show_event_modal = !self.show_event_modal;
    }

    pub fn toggle_detail_panel(&mut self) {
        self.show_detail_panel = !self.show_detail_panel;
    }

    pub fn close_detail_panel(&mut self) {
        self.show_detail_panel = false;
        self.selected_reminder_id = None;
    }

    pub fn get_selected_reminder(&self) -> Option<&Reminder> {
        self.selected_reminder_id
            .and_then(|id| self.reminders.iter().find(|r| r.id == id))
    }

    pub fn set_editing_reminder(&mut self, id: Option<Uuid>) {
        self.editing_reminder_id = id;
    }

    pub fn get_editing_reminder(&self) -> Option<&Reminder> {
        self.editing_reminder_id
            .and_then(|id| self.reminders.iter().find(|r| r.id == id))
    }

    pub fn get_reminders_for_date(&self, date: Option<NaiveDate>) -> Vec<Reminder> {
        if let Some(d) = date {
            self.reminders
                .iter()
                .filter(|r| r.due_date == Some(d) && !r.is_completed)
                .cloned()
                .collect()
        } else {
            Vec::new()
        }
    }

    pub fn has_reminder_on_date(&self, date: NaiveDate) -> bool {
        self.reminders
            .iter()
            .any(|r| r.due_date == Some(date) && !r.is_completed)
    }

    pub fn get_filtered_reminders(&self) -> Vec<Reminder> {
        let today = Local::now().date_naive();

        match &self.reminder_filter {
            ReminderFilter::Today => self
                .reminders
                .iter()
                .filter(|r| r.due_date.map(|d| d == today).unwrap_or(false) && !r.is_completed)
                .cloned()
                .collect(),
            ReminderFilter::Planned => self
                .reminders
                .iter()
                .filter(|r| r.due_date.is_some() && !r.is_completed)
                .cloned()
                .collect(),
            ReminderFilter::All => self
                .reminders
                .iter()
                .filter(|r| !r.is_completed)
                .cloned()
                .collect(),
            ReminderFilter::List(id) => self
                .reminders
                .iter()
                .filter(|r| r.list_id == Some(*id) && !r.is_completed)
                .cloned()
                .collect(),
            ReminderFilter::Search(keyword) => self.search_reminders(keyword),
        }
    }
}
