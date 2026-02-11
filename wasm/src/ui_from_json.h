#ifndef UI_FROM_JSON_H
#define UI_FROM_JSON_H

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Parse a JSON string describing a UI and create LVGL widgets on the active screen.
 * @param json_str  null-terminated JSON string
 */
void ui_from_json(const char *json_str);

#ifdef __cplusplus
}
#endif

#endif /* UI_FROM_JSON_H */
