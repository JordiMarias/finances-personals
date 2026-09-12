/* tslint:disable */
/* eslint-disable */

export function wasm_add_expense(config_json: string, category_id: string, amount: number, note: string, date: string): string;

export function wasm_add_recurring(config_json: string, name: string, amount: number, frequency_str: string, category_id: string): string;

export function wasm_advance_day(config_json: string): string;

export function wasm_advance_day_with_settlement(config_json: string): string;

export function wasm_clear_expenses(config_json: string): string;

export function wasm_get_all_summaries(config_json: string): string;

export function wasm_get_cycle_info(target_date: string, billing_start_day: number): string;

export function wasm_get_default_config(): string;

export function wasm_get_summaries_for_date(config_json: string, target_date: string): string;

export function wasm_remove_expense(config_json: string, expense_id: string): string;

export function wasm_remove_recurring(config_json: string, rec_id: string): string;

export function wasm_reset_default_percentages(config_json: string): string;

export function wasm_settle_month(config_json: string): string;

export function wasm_update_billing_cycle_day(config_json: string, start_day: number): string;

export function wasm_update_category_percentage(config_json: string, category_id: string, percentage: number): string;

export function wasm_update_expense(config_json: string, expense_id: string, category_id: string, amount: number, note: string, date: string): string;

export function wasm_update_income(config_json: string, new_income: number): string;

export function wasm_update_recurring(config_json: string, rec_id: string, name: string, amount: number, frequency_str: string, category_id: string): string;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly wasm_add_expense: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly wasm_add_recurring: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
    readonly wasm_advance_day: (a: number, b: number) => [number, number];
    readonly wasm_advance_day_with_settlement: (a: number, b: number) => [number, number];
    readonly wasm_clear_expenses: (a: number, b: number) => [number, number];
    readonly wasm_get_all_summaries: (a: number, b: number) => [number, number];
    readonly wasm_get_cycle_info: (a: number, b: number, c: number) => [number, number];
    readonly wasm_get_default_config: () => [number, number];
    readonly wasm_get_summaries_for_date: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasm_remove_expense: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasm_remove_recurring: (a: number, b: number, c: number, d: number) => [number, number];
    readonly wasm_reset_default_percentages: (a: number, b: number) => [number, number];
    readonly wasm_settle_month: (a: number, b: number) => [number, number];
    readonly wasm_update_billing_cycle_day: (a: number, b: number, c: number) => [number, number];
    readonly wasm_update_category_percentage: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly wasm_update_expense: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly wasm_update_income: (a: number, b: number, c: number) => [number, number];
    readonly wasm_update_recurring: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
