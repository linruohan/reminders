use crate::models::owner::Owner;
use crate::models::reminder::{Priority, Reminder, ReminderList};
use crate::state::filtering::apply_filter;
use crate::state::{AppView, CalendarViewMode, ReminderFilter};
use chrono::{Datelike, Local, NaiveDate};
use uuid::Uuid;

pub struct AppState {
    pub reminders: Vec<Reminder>,
    pub lists: Vec<ReminderList>,
    pub owners: Vec<Owner>,
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
            owners: Vec::new(),
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

    pub fn default_list_id(&self) -> Option<Uuid> {
        self.selected_list_id
            .or_else(|| self.lists.first().map(|l| l.id))
    }

    pub fn list_name(&self, list_id: Option<Uuid>) -> String {
        list_id
            .and_then(|id| self.lists.iter().find(|l| l.id == id))
            .map(|l| l.name.clone())
            .unwrap_or_else(|| "提醒事项".to_string())
    }

    pub fn refresh_data(
        &mut self,
        reminders: Vec<Reminder>,
        lists: Vec<ReminderList>,
        owners: Vec<Owner>,
    ) {
        self.reminders = reminders;
        self.lists = lists;
        self.owners = owners;
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
        if self.editing_reminder_id == Some(id) {
            self.editing_reminder_id = None;
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
                self.reminder_filter = ReminderFilter::Open;
            }
        }
    }

    pub fn add_owner(&mut self, owner: Owner) {
        self.owners.push(owner);
    }

    pub fn update_owner(&mut self, id: Uuid, updated: Owner) {
        if let Some(index) = self.owners.iter().position(|o| o.id == id) {
            self.owners[index] = updated;
        }
    }

    pub fn delete_owner(&mut self, id: Uuid) {
        self.owners.retain(|o| o.id != id);
        for reminder in &mut self.reminders {
            if reminder.owner_id == Some(id) {
                reminder.owner_id = None;
            }
        }
    }

    pub fn owner_name(&self, owner_id: Option<Uuid>) -> String {
        owner_id
            .and_then(|id| self.owners.iter().find(|o| o.id == id))
            .map(|o| o.name.clone())
            .unwrap_or_default()
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
        apply_filter(&self.reminders, &self.reminder_filter)
    }

    pub fn count_for_filter(&self, filter: ReminderFilter) -> usize {
        apply_filter(&self.reminders, &filter).len()
    }

    pub fn set_priority(&mut self, id: Uuid, priority: Priority) {
        if let Some(r) = self.reminders.iter_mut().find(|r| r.id == id) {
            r.priority = priority;
            r.updated_at = Local::now();
        }
    }

    pub fn move_reminder_to_list(&mut self, id: Uuid, list_id: Uuid) {
        if let Some(r) = self.reminders.iter_mut().find(|r| r.id == id) {
            r.list_id = Some(list_id);
            r.updated_at = Local::now();
        }
    }

    pub fn toggle_completed(&mut self, id: Uuid) {
        if let Some(r) = self.reminders.iter_mut().find(|r| r.id == id) {
            if r.is_completed {
                r.is_completed = false;
                r.completion_date = None;
            } else {
                r.is_completed = true;
                r.completion_date = Some(Local::now());
            }
            r.updated_at = Local::now();
        }
    }

    pub fn set_due_tomorrow(&mut self, id: Uuid) {
        if let Some(r) = self.reminders.iter_mut().find(|r| r.id == id) {
            r.due_date = Local::now().date_naive().succ_opt();
            r.updated_at = Local::now();
        }
    }
}
