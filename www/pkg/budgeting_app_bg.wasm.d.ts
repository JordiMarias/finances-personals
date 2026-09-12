/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const wasm_add_expense: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
export const wasm_add_recurring: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => [number, number];
export const wasm_advance_day: (a: number, b: number) => [number, number];
export const wasm_advance_day_with_settlement: (a: number, b: number) => [number, number];
export const wasm_clear_expenses: (a: number, b: number) => [number, number];
export const wasm_get_all_summaries: (a: number, b: number) => [number, number];
export const wasm_get_cycle_info: (a: number, b: number, c: number) => [number, number];
export const wasm_get_default_config: () => [number, number];
export const wasm_get_summaries_for_date: (a: number, b: number, c: number, d: number) => [number, number];
export const wasm_remove_expense: (a: number, b: number, c: number, d: number) => [number, number];
export const wasm_remove_recurring: (a: number, b: number, c: number, d: number) => [number, number];
export const wasm_reset_default_percentages: (a: number, b: number) => [number, number];
export const wasm_settle_month: (a: number, b: number) => [number, number];
export const wasm_update_billing_cycle_day: (a: number, b: number, c: number) => [number, number];
export const wasm_update_category_percentage: (a: number, b: number, c: number, d: number, e: number) => [number, number];
export const wasm_update_expense: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
export const wasm_update_income: (a: number, b: number, c: number) => [number, number];
export const wasm_update_recurring: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_start: () => void;
