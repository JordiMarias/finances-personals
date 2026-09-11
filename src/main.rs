use budgeting_app::model::*;
use budgeting_app::engine::BudgetEngine;
use budgeting_app::storage::StorageManager;
use std::env;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::process::Command;
use std::thread;

const HTML_CONTENT: &str = include_str!("../www/index.html");
const CSS_CONTENT: &str = include_str!("../www/style.css");
const JS_CONTENT: &str = include_str!("../www/app.js");

fn handle_client(mut stream: TcpStream) {
    let mut buffer = [0; 2048];
    if let Ok(bytes_read) = stream.read(&mut buffer) {
        if bytes_read == 0 {
            return;
        }
        let request = String::from_utf8_lossy(&buffer[..bytes_read]);
        let first_line = request.lines().next().unwrap_or("");
        let mut parts = first_line.split_whitespace();
        let _method = parts.next().unwrap_or("");
        let path = parts.next().unwrap_or("/");

        let (status_line, content_type, body) = match path {
            "/" | "/index.html" => ("HTTP/1.1 200 OK", "text/html; charset=utf-8", HTML_CONTENT),
            "/style.css" => ("HTTP/1.1 200 OK", "text/css; charset=utf-8", CSS_CONTENT),
            "/app.js" => ("HTTP/1.1 200 OK", "application/javascript; charset=utf-8", JS_CONTENT),
            _ => ("HTTP/1.1 404 NOT FOUND", "text/plain", "404 Not Found"),
        };

        let response = format!(
            "{}\r\nContent-Type: {}\r\nContent-Length: {}\r\nConnection: close\r\nAccess-Control-Allow-Origin: *\r\n\r\n{}",
            status_line,
            content_type,
            body.len(),
            body
        );

        let _ = stream.write_all(response.as_bytes());
        let _ = stream.flush();
    }
}

fn open_desktop_window(url: &str) {
    // Try opening as standalone application window (Chromium / Chrome / Brave)
    let app_arg = format!("--app={}", url);
    let browsers = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "brave-browser"];

    for browser in &browsers {
        if let Ok(mut child) = Command::new(browser).arg(&app_arg).spawn() {
            println!("✅ S'ha obert la interfície d'escriptori amb {}", browser);
            let _ = child.wait();
            return;
        }
    }

    // Fallback to system default browser (Linux xdg-open, macOS open, Windows start)
    #[cfg(target_os = "linux")]
    {
        if Command::new("xdg-open").arg(url).spawn().is_ok() {
            println!("✅ S'ha obert al navegador per defecte (xdg-open)");
            return;
        }
    }

    #[cfg(target_os = "windows")]
    {
        let _ = Command::new("cmd").args(["/C", "start", url]).spawn();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = Command::new("open").arg(url).spawn();
    }

    println!("🌐 Obre manualment l'adreça al teu navegador: {}", url);
}

fn print_cli_summary() {
    println!("============================================================");
    println!("  GESTOR DE FINANCES PERSONALS - RESUM CLI");
    println!("============================================================\n");

    let config = BudgetConfig::default();

    println!("Salari Net Mensual: {:.2} € (SMI de Referència)", config.monthly_income);
    println!("Dies del Mes: {}", config.days_in_month);
    println!("Dia Actual: {}\n", config.current_day);

    let summaries = BudgetEngine::get_all_summaries(&config);

    println!("{:<25} | {:<10} | {:<12} | {:<12} | {:<10}", 
        "Categoria", "Brut (M)", "Recurrent (M)", "Net (M)", "Diari Net");
    println!("-----------------------------------------------------------------------------");

    let mut total_gross = 0.0;
    let mut total_rec = 0.0;
    let mut total_net = 0.0;
    let mut total_daily = 0.0;

    for s in &summaries {
        println!("{:<25} | {:>8.2} € | {:>10.2} € | {:>10.2} € | {:>8.2} €",
            format!("{} {}", s.category.icon, s.category.name),
            s.gross_monthly_budget,
            s.recurring_monthly_cost,
            s.net_monthly_budget,
            s.net_daily_budget
        );
        total_gross += s.gross_monthly_budget;
        total_rec += s.recurring_monthly_cost;
        total_net += s.net_monthly_budget;
        total_daily += s.net_daily_budget;
    }

    println!("-----------------------------------------------------------------------------");
    println!("{:<25} | {:>8.2} € | {:>10.2} € | {:>10.2} € | {:>8.2} €",
        "TOTALS", total_gross, total_rec, total_net, total_daily
    );
    println!("============================================================\n");

    if let Ok(json) = StorageManager::to_json(&config) {
        println!("Estat JSON inicial ({} bytes).", json.len());
    }
}

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.contains(&"--cli".to_string()) || args.contains(&"-c".to_string()) {
        print_cli_summary();
        return;
    }

    let port = 8085;
    let listener = match TcpListener::bind(format!("127.0.0.1:{}", port)) {
        Ok(l) => l,
        Err(_) => match TcpListener::bind("127.0.0.1:0") {
            Ok(l) => l,
            Err(e) => {
                eprintln!("Error en iniciar el servidor local: {}", e);
                return;
            }
        },
    };

    let actual_port = listener.local_addr().unwrap().port();
    let url = format!("http://127.0.0.1:{}", actual_port);

    println!("============================================================");
    println!("  🏛️ GESTOR DE FINANCES PERSONALS (DESKTOP & WEB APP)");
    println!("============================================================");
    println!("🚀 Servidor d'aplicació iniciat a: {}", url);
    println!("📌 S'està obrint la interfície gràfica d'escriptori...");
    println!("(Prem Ctrl+C per aturar l'aplicació)\n");

    let server_listener = listener.try_clone().expect("Error clonant listener");
    thread::spawn(move || {
        for stream in server_listener.incoming() {
            if let Ok(stream) = stream {
                thread::spawn(|| handle_client(stream));
            }
        }
    });

    // Launch GUI window
    open_desktop_window(&url);

    // Keep main thread alive
    loop {
        thread::sleep(std::time::Duration::from_secs(1));
    }
}

