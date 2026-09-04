// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::{Duration, Instant};
use sysinfo::{CpuRefreshKind, RefreshKind, System};
use tauri::{Manager, Window};

#[derive(Clone, Serialize)]
struct HardwareMetrics {
    cpu_percent: f32,
    ram_percent: f32,
    total_mem_gb: f32,
    free_mem_gb: f32,
    tick_delta_ms: u128,
}

#[derive(Clone, Serialize)]
struct GameOverPayload {
    reason: String,
    metrics: HardwareMetrics,
}

// Bucle en segundo plano para monitorización a 250ms y Watchdog de seguridad
fn start_hardware_watchdog(window: Window, is_game_over: Arc<AtomicBool>) {
    std::thread::spawn(move || {
        let mut sys = System::new_with_specifics(
            RefreshKind::new()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(),
        );

        let interval = Duration::from_millis(250);
        let mut last_tick = Instant::now();
        let mut sustained_cpu_ticks = 0;
        let mut consecutive_lags = 0;

        loop {
            std::thread::sleep(interval);

            let now = Instant::now();
            let delta_ms = now.duration_since(last_tick).as_millis();
            last_tick = now;

            // Actualizar datos de CPU y Memoria
            sys.refresh_cpu();
            sys.refresh_memory();

            let cpu_percent = sys.global_cpu_info().cpu_usage();
            let total_mem = sys.total_memory() as f32;
            let used_mem = sys.used_memory() as f32;
            let ram_percent = (used_mem / total_mem) * 100.0;

            let metrics = HardwareMetrics {
                cpu_percent,
                ram_percent,
                total_mem_gb: total_mem / (1024.0 * 1024.0 * 1024.0),
                free_mem_gb: (sys.total_memory() - sys.used_memory()) as f32 / (1024.0 * 1024.0 * 1024.0),
                tick_delta_ms: delta_ms,
            };

            // Emitir métricas a la ventana
            let _ = window.emit("hardware-metrics", &metrics);

            // CONDICIONES DEL WATCHDOG
            let mut triggered = false;
            let mut reason = String::new();

            // 1. Latencia > 600ms (Congelamiento del SO)
            if delta_ms > 600 {
                consecutive_lags += 1;
                if consecutive_lags >= 2 || delta_ms >= 1200 {
                    triggered = true;
                    reason = format!("Congelamiento del sistema detectado (Delta: {}ms > 600ms)", delta_ms);
                }
            } else {
                consecutive_lags = 0;
            }

            // 2. RAM > 92%
            if ram_percent >= 92.0 {
                triggered = true;
                reason = format!("Límite crítico de RAM superado ({:.1}% >= 92.0%)", ram_percent);
            }

            // 3. CPU >= 98% durante > 3 segundos (12 ticks de 250ms)
            if cpu_percent >= 98.0 {
                sustained_cpu_ticks += 1;
                if sustained_cpu_ticks >= 12 {
                    triggered = true;
                    reason = format!("CPU al 98%+ sostenida durante más de 3 segundos");
                }
            } else {
                sustained_cpu_ticks = 0;
            }

            if triggered && !is_game_over.load(Ordering::SeqCst) {
                is_game_over.store(true, Ordering::SeqCst);
                let _ = window.emit(
                    "game-over",
                    GameOverPayload {
                        reason,
                        metrics: metrics.clone(),
                    },
                );
            }
        }
    });
}

#[tauri::command]
fn reset_game(is_game_over: tauri::State<Arc<AtomicBool>>) {
    is_game_over.store(false, Ordering::SeqCst);
}

fn main() {
    let is_game_over = Arc::new(AtomicBool::new(false));
    let is_game_over_clone = Arc::clone(&is_game_over);

    tauri::Builder::default()
        .manage(is_game_over)
        .invoke_handler(tauri::generate_handler![reset_game])
        .setup(move |app| {
            let main_window = app.get_window("main").unwrap();
            start_hardware_watchdog(main_window, is_game_over_clone);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
