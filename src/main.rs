mod app;
mod models;
mod state;
mod views;

use app::App;
use gpui::*;

fn main() {
    Application::new().run(|cx| {
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
                titlebar: Some(TitlebarOptions {
                    title: Some("提醒事项".into()),
                    appears_transparent: false,
                    traffic_light_position: None,
                }),
                ..Default::default()
            },
            |_window, cx| cx.new(|cx| App::new(cx)),
        )
        .unwrap();
    });
}
