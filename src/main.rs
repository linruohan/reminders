mod app;
mod models;
mod state;
mod views;

use app::App;
use gpui::*;
use gpui_component::TitleBar;
use gpui_component_assets::Assets;

fn main() {
    gpui_platform::application().with_assets(Assets).run(|cx| {
        gpui_component::init(cx);
        
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
            |_window, cx| cx.new(|cx| App::new(cx)),
        )
        .unwrap();
    });
}