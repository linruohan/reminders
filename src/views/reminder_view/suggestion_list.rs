use super::content::EditableReminder;
use gpui::{
    App, Context, Entity, FontWeight, Hsla, IntoElement, ParentElement, RenderOnce, SharedString,
    Styled, Window, div, prelude::FluentBuilder as _, px,
};
use gpui_component::list::{ListDelegate, ListItem, ListState};
use gpui_component::{Icon, IconName, IndexPath, Selectable, Sizable, h_flex, v_flex};

#[derive(Clone)]
pub enum SuggestionAction {
    Date(chrono::NaiveDate),
    Time(String),
    Location(String),
}

#[derive(Clone)]
pub struct SuggestionEntry {
    pub icon: IconName,
    pub icon_color: Hsla,
    pub primary: SharedString,
    pub secondary: Option<SharedString>,
    pub action: SuggestionAction,
}

#[derive(Clone)]
pub struct SuggestionSection {
    pub title: SharedString,
    pub items: Vec<SuggestionEntry>,
}

pub struct SuggestionListDelegate {
    sections: Vec<SuggestionSection>,
    selected_index: Option<IndexPath>,
    confirmed_action: Option<SuggestionAction>,
    reminder_entity: Entity<EditableReminder>,
}

impl SuggestionListDelegate {
    pub fn new(
        sections: Vec<SuggestionSection>,
        confirmed_action: Option<SuggestionAction>,
        reminder_entity: Entity<EditableReminder>,
    ) -> Self {
        Self {
            sections,
            selected_index: None,
            confirmed_action,
            reminder_entity,
        }
    }

    pub(crate) fn set_data(
        &mut self,
        sections: Vec<SuggestionSection>,
        confirmed_action: Option<SuggestionAction>,
    ) {
        self.sections = sections;
        self.confirmed_action = confirmed_action;
        self.selected_index = None;
    }

    fn entry_at(&self, ix: IndexPath) -> Option<&SuggestionEntry> {
        self.sections
            .get(ix.section)
            .and_then(|section| section.items.get(ix.row))
    }

    fn is_confirmed(&self, entry: &SuggestionEntry) -> bool {
        match (&self.confirmed_action, &entry.action) {
            (Some(SuggestionAction::Date(a)), SuggestionAction::Date(b)) => a == b,
            (Some(SuggestionAction::Time(a)), SuggestionAction::Time(b)) => a == b,
            (Some(SuggestionAction::Location(a)), SuggestionAction::Location(b)) => a == b,
            _ => false,
        }
    }
}

#[derive(IntoElement)]
struct SuggestionListItem {
    base: ListItem,
    selected: bool,
}

impl SuggestionListItem {
    fn new(
        id: impl Into<gpui::ElementId>,
        entry: &SuggestionEntry,
        selected: bool,
        confirmed: bool,
    ) -> Self {
        Self {
            selected,
            base: ListItem::new(id)
                .selected(selected)
                .confirmed(confirmed)
                .child(
                    h_flex()
                        .items_center()
                        .gap(px(10.0))
                        .child(
                            Icon::new(entry.icon.clone())
                                .with_size(gpui_component::Size::Size(px(16.0)))
                                .text_color(entry.icon_color),
                        )
                        .child(
                            v_flex()
                                .child(
                                    div()
                                        .text_size(px(14.0))
                                        .font_weight(FontWeight(500.0))
                                        .child(entry.primary.clone()),
                                )
                                .when_some(entry.secondary.clone(), |this, sub| {
                                    this.child(
                                        div()
                                            .text_size(px(12.0))
                                            .text_color(gpui::rgba(0x8e8e93ff))
                                            .child(sub),
                                    )
                                }),
                        ),
                ),
        }
    }
}

impl Selectable for SuggestionListItem {
    fn selected(mut self, selected: bool) -> Self {
        self.selected = selected;
        self.base = self.base.selected(selected);
        self
    }

    fn is_selected(&self) -> bool {
        self.selected
    }
}

impl RenderOnce for SuggestionListItem {
    fn render(self, _: &mut Window, _: &mut App) -> impl IntoElement {
        self.base
    }
}

impl ListDelegate for SuggestionListDelegate {
    type Item = SuggestionListItem;

    fn sections_count(&self, _: &App) -> usize {
        self.sections.len().max(1)
    }

    fn items_count(&self, section: usize, _: &App) -> usize {
        self.sections
            .get(section)
            .map(|s| s.items.len())
            .unwrap_or(0)
    }

    fn render_item(
        &mut self,
        ix: IndexPath,
        _window: &mut Window,
        _cx: &mut Context<ListState<Self>>,
    ) -> Option<Self::Item> {
        let entry = self.entry_at(ix)?;
        let selected = self.selected_index.map(|s| s == ix).unwrap_or(false);
        let confirmed = self.is_confirmed(entry);
        Some(SuggestionListItem::new(
            format!("suggestion-{}-{}", ix.section, ix.row),
            entry,
            selected,
            confirmed,
        ))
    }

    fn render_section_header(
        &mut self,
        section: usize,
        _: &mut Window,
        _: &mut Context<ListState<Self>>,
    ) -> Option<impl IntoElement> {
        self.sections.get(section).map(|section| {
            div()
                .px(px(8.0))
                .py(px(4.0))
                .text_size(px(11.0))
                .font_weight(FontWeight(600.0))
                .text_color(gpui::rgba(0x8e8e93ff))
                .child(section.title.clone())
        })
    }

    fn set_selected_index(
        &mut self,
        ix: Option<IndexPath>,
        _: &mut Window,
        _: &mut Context<ListState<Self>>,
    ) {
        self.selected_index = ix;
    }

    fn confirm(&mut self, _: bool, _: &mut Window, cx: &mut Context<ListState<Self>>) {
        let Some(ix) = self.selected_index else {
            return;
        };
        let Some(entry) = self.entry_at(ix).cloned() else {
            return;
        };
        self.reminder_entity.update(cx, |this, cx| {
            this.apply_suggestion(entry.action, cx);
        });
    }
}
