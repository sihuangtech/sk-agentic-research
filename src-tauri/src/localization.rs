use std::{collections::HashMap, sync::LazyLock};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{TrayIcon, TrayIconBuilder},
    Manager, Wry,
};

struct TrayLabels {
    show: MenuItem<Wry>,
    quit: MenuItem<Wry>,
    tray: TrayIcon<Wry>,
}

static CATALOGS: LazyLock<HashMap<&str, HashMap<String, String>>> = LazyLock::new(|| {
    [
        ("zh-CN", include_str!("../../shared/locales/zh-CN.json")),
        ("zh-TW", include_str!("../../shared/locales/zh-TW.json")),
        ("en", include_str!("../../shared/locales/en.json")),
        ("ja", include_str!("../../shared/locales/ja.json")),
        ("ko", include_str!("../../shared/locales/ko.json")),
        ("fr", include_str!("../../shared/locales/fr.json")),
        ("de", include_str!("../../shared/locales/de.json")),
        ("es", include_str!("../../shared/locales/es.json")),
        ("pt-BR", include_str!("../../shared/locales/pt-BR.json")),
        ("ru", include_str!("../../shared/locales/ru.json")),
    ]
    .into_iter()
    .map(|(locale, source)| {
        (
            locale,
            serde_json::from_str(source).expect("Invalid bundled locale"),
        )
    })
    .collect()
});
fn messages(locale: &str) -> &'static HashMap<String, String> {
    &CATALOGS[locale]
}
fn labels(locale: &str) -> (&'static str, &'static str, &'static str) {
    let data = messages(locale);
    (&data["trayShow"], &data["trayQuit"], &data["trayTooltip"])
}

pub fn create_tray(app: &tauri::App) -> tauri::Result<()> {
    let (show_label, quit_label, tooltip) = labels("zh-CN");
    let show = MenuItem::with_id(app, "show", show_label, true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", quit_label, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;
    let mut builder = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip(tooltip)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        });
    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }
    let tray = builder.build(app)?;
    app.manage(TrayLabels { show, quit, tray });
    Ok(())
}

#[tauri::command]
pub fn set_locale(app: tauri::AppHandle, locale: String) -> Result<(), String> {
    if !CATALOGS.contains_key(locale.as_str()) {
        return Err("Unsupported locale".into());
    }
    let state = app.state::<TrayLabels>();
    let (show, quit, tooltip) = labels(&locale);
    state.show.set_text(show).map_err(|e| e.to_string())?;
    state.quit.set_text(quit).map_err(|e| e.to_string())?;
    state
        .tray
        .set_tooltip(Some(tooltip))
        .map_err(|e| e.to_string())?;
    if let Some(window) = app.get_webview_window("main") {
        window
            .set_title(&messages(&locale)["windowTitle"])
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{labels, CATALOGS};
    #[test]
    fn tray_labels_are_localized() {
        assert_eq!(labels("en").0, "Open Second Moon");
        assert_eq!(labels("zh-CN").0, "打开第二月亮");
        let languages: Vec<serde_json::Value> =
            serde_json::from_str(include_str!("../../shared/languages.json")).unwrap();
        assert_eq!(languages.len(), CATALOGS.len());
        for language in languages {
            let code = language["code"].as_str().unwrap();
            let (show, quit, tooltip) = labels(code);
            assert!(!show.is_empty() && !quit.is_empty() && !tooltip.is_empty());
            assert!(!CATALOGS[code]["windowTitle"].is_empty());
        }
    }
}
