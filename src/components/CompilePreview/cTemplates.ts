/**
 * C source templates for server-side emcc compilation
 *
 * Generates pure C code (no C++ features) for the main wrapper.
 * The server-side plugin uses its own embedded template, but this
 * is kept for reference and potential client-side code generation.
 */

/**
 * Generate the complete main wrapper source that includes:
 * - Display driver (framebuffer-based)
 * - Input device drivers (mouse pointer + keyboard)
 * - Exported tick/mouse/key functions for JS event loop
 * - User UI code (via #include "ui.h")
 * - main() that initializes LVGL, creates display & indevs, runs initial ticks, then returns
 *
 * @param width  Canvas width
 * @param height Canvas height
 */
export function generateMainWrapper(width: number, height: number): string {
  return `#include "lvgl/lvgl.h"
#include <string.h>
#include <emscripten.h>

#define MAX_FB_WIDTH  800
#define MAX_FB_HEIGHT 600

static uint32_t framebuffer[MAX_FB_WIDTH * MAX_FB_HEIGHT];
static volatile int fb_ready = 0;
static int disp_width  = ${width};
static int disp_height = ${height};
static uint8_t draw_buf[MAX_FB_WIDTH * MAX_FB_HEIGHT * 4];

static lv_indev_data_t mouse_data;
static uint32_t last_key = 0;
static lv_indev_state_t key_state = LV_INDEV_STATE_RELEASED;

static void mouse_read_cb(lv_indev_t *indev, lv_indev_data_t *data) {
    (void)indev;
    data->point.x = mouse_data.point.x;
    data->point.y = mouse_data.point.y;
    data->state = mouse_data.state;
}

static void keyboard_read_cb(lv_indev_t *indev, lv_indev_data_t *data) {
    (void)indev;
    data->key = last_key;
    data->state = key_state;
}

EMSCRIPTEN_KEEPALIVE uint32_t* wasi_get_framebuffer(void) { return framebuffer; }
EMSCRIPTEN_KEEPALIVE int       wasi_get_fb_ready(void)    { return fb_ready; }
EMSCRIPTEN_KEEPALIVE void      wasi_clear_fb_ready(void)  { fb_ready = 0; }
EMSCRIPTEN_KEEPALIVE int       wasi_get_width(void)       { return disp_width; }
EMSCRIPTEN_KEEPALIVE int       wasi_get_height(void)      { return disp_height; }

static void flush_cb(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
    int32_t w = area->x2 - area->x1 + 1;
    int32_t h = area->y2 - area->y1 + 1;
    uint32_t *src = (uint32_t *)px_map;

    for (int32_t y = 0; y < h; y++) {
        int32_t dst_y = area->y1 + y;
        if (dst_y < 0 || dst_y >= disp_height) continue;
        for (int32_t x = 0; x < w; x++) {
            int32_t dst_x = area->x1 + x;
            if (dst_x < 0 || dst_x >= disp_width) continue;
            framebuffer[dst_y * disp_width + dst_x] = src[y * w + x];
        }
    }
    fb_ready = 1;
    lv_display_flush_ready(disp);
}

EMSCRIPTEN_KEEPALIVE void app_tick(uint32_t ms) {
    lv_tick_inc(ms);
    lv_timer_handler();
}

EMSCRIPTEN_KEEPALIVE void app_mouse_event(int x, int y, int pressed) {
    mouse_data.point.x = x;
    mouse_data.point.y = y;
    mouse_data.state = pressed ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}

EMSCRIPTEN_KEEPALIVE void app_key_event(uint32_t key, int pressed) {
    last_key = key;
    key_state = pressed ? LV_INDEV_STATE_PRESSED : LV_INDEV_STATE_RELEASED;
}

#include "ui.h"

int main(void) {
    lv_init();

    disp_width = ${width};
    disp_height = ${height};
    lv_display_t *disp = lv_display_create(disp_width, disp_height);
    lv_display_set_flush_cb(disp, flush_cb);
    lv_display_set_buffers(disp, draw_buf, NULL,
                           disp_width * disp_height * 4, LV_DISPLAY_RENDER_MODE_FULL);
    lv_display_set_color_format(disp, LV_COLOR_FORMAT_ARGB8888);

    memset(&mouse_data, 0, sizeof(mouse_data));
    mouse_data.state = LV_INDEV_STATE_RELEASED;

    lv_indev_t *mouse_indev = lv_indev_create();
    lv_indev_set_type(mouse_indev, LV_INDEV_TYPE_POINTER);
    lv_indev_set_read_cb(mouse_indev, mouse_read_cb);

    lv_indev_t *kb_indev = lv_indev_create();
    lv_indev_set_type(kb_indev, LV_INDEV_TYPE_KEYPAD);
    lv_indev_set_read_cb(kb_indev, keyboard_read_cb);

    ui_init();

    for (int i = 0; i < 10; i++) {
        lv_timer_handler();
        lv_tick_inc(33);
    }

    return 0;
}
`;
}
