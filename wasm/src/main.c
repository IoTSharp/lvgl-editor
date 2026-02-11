#include "lvgl.h"
#include "ui_from_json.h"
#include <emscripten.h>
#include <emscripten/html5.h>

static lv_display_t *display;

static uint32_t tick_get_cb(void) {
    return (uint32_t)emscripten_get_now();
}

static void main_loop(void) {
    lv_timer_handler();
}

EMSCRIPTEN_KEEPALIVE
void load_ui_json(const char *json_str) {
    lv_obj_clean(lv_screen_active());
    ui_from_json(json_str);
}

EMSCRIPTEN_KEEPALIVE
void set_screen_size(int w, int h) {
    /* For now we just recreate the display at the requested size.
       A full implementation would resize the SDL window. */
    (void)w; (void)h;
}

int main(int argc, char *argv[]) {
    (void)argc; (void)argv;

    lv_init();
    lv_tick_set_cb(tick_get_cb);

    display = lv_sdl_window_create(480, 320);
    lv_sdl_mouse_create();

    emscripten_set_main_loop(main_loop, 0, 1);

    return 0;
}
