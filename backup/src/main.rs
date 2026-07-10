mod app;
mod database;
mod models;
mod repository;
mod state;
mod views;

use app::App;
use gpui::*;
use gpui_component::{Root, TitleBar};
use gpui_component_assets::Assets;
use std::path::Path;

fn main() {
    gpui_platform::application().with_assets(Assets).run(|cx| {
        gpui_component::init(cx);

        let db_path = Path::new("reminders.db");
        match crate::database::Database::open(db_path) {
            Ok(db) => {
                cx.open_window(
                    WindowOptions {
                        window_bounds: Some(WindowBounds::Windowed(Bounds {
                            origin: Point {
                                x: px(100.0),
                                y: px(100.0),
                            },
                            size: Size {
                                width: px(800.0),
                                height: px(660.0),
                            },
                        })),
                        titlebar: Some(TitleBar::title_bar_options()),
                        ..Default::default()
                    },
                    |window, cx| {
                        let app_view = cx.new(|cx| App::new(db, cx));
                        cx.new(|cx| Root::new(app_view, window, cx))
                    },
                )
                .unwrap();
            }
            Err(e) => {
                eprintln!("Failed to open database: {}", e);
            }
        }
    });
}
