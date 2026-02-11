/*
 * ui_from_json.c  –  Parse JSON and create real LVGL widgets
 * Uses cJSON for parsing.
 */
#include "ui_from_json.h"
#include "cJSON.h"
#include "lvgl.h"
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/* Parse "#RRGGBB" to lv_color_t */
static lv_color_t hex_to_color(const char *hex) {
    if (!hex || hex[0] != '#' || strlen(hex) < 7)
        return lv_color_hex(0x000000);
    unsigned long v = strtoul(hex + 1, NULL, 16);
    return lv_color_hex(v);
}

static const char *cjson_get_string(const cJSON *obj, const char *key) {
    cJSON *item = cJSON_GetObjectItemCaseSensitive(obj, key);
    if (cJSON_IsString(item)) return item->valuestring;
    return NULL;
}

static int cjson_get_int(const cJSON *obj, const char *key, int def) {
    cJSON *item = cJSON_GetObjectItemCaseSensitive(obj, key);
    if (cJSON_IsNumber(item)) return item->valueint;
    return def;
}

static double cjson_get_double(const cJSON *obj, const char *key, double def) {
    cJSON *item = cJSON_GetObjectItemCaseSensitive(obj, key);
    if (cJSON_IsNumber(item)) return item->valuedouble;
    return def;
}

static int cjson_get_bool(const cJSON *obj, const char *key, int def) {
    cJSON *item = cJSON_GetObjectItemCaseSensitive(obj, key);
    if (cJSON_IsBool(item)) return cJSON_IsTrue(item);
    return def;
}

/* ------------------------------------------------------------------ */
/*  Style application                                                  */
/* ------------------------------------------------------------------ */

static void apply_style_state(lv_obj_t *obj, const cJSON *style, lv_style_selector_t sel) {
    if (!style) return;

    const char *s;
    cJSON *item;

    /* bgColor */
    s = cjson_get_string(style, "bgColor");
    if (s && strcmp(s, "transparent") != 0) {
        lv_obj_set_style_bg_opa(obj, LV_OPA_COVER, sel);
        lv_obj_set_style_bg_color(obj, hex_to_color(s), sel);
    } else if (s && strcmp(s, "transparent") == 0) {
        lv_obj_set_style_bg_opa(obj, LV_OPA_TRANSP, sel);
    }

    /* borderColor */
    s = cjson_get_string(style, "borderColor");
    if (s && strcmp(s, "transparent") != 0)
        lv_obj_set_style_border_color(obj, hex_to_color(s), sel);

    /* borderWidth */
    item = cJSON_GetObjectItemCaseSensitive(style, "borderWidth");
    if (cJSON_IsNumber(item))
        lv_obj_set_style_border_width(obj, item->valueint, sel);

    /* borderRadius */
    item = cJSON_GetObjectItemCaseSensitive(style, "borderRadius");
    if (cJSON_IsNumber(item))
        lv_obj_set_style_radius(obj, item->valueint, sel);

    /* textColor */
    s = cjson_get_string(style, "textColor");
    if (s) lv_obj_set_style_text_color(obj, hex_to_color(s), sel);

    /* opacity */
    item = cJSON_GetObjectItemCaseSensitive(style, "opacity");
    if (cJSON_IsNumber(item)) {
        int opa = item->valueint;
        if (opa <= 1) opa = (int)(item->valuedouble * 255);
        lv_obj_set_style_opa(obj, (lv_opa_t)opa, sel);
    }

    /* padding (uniform) */
    item = cJSON_GetObjectItemCaseSensitive(style, "padding");
    if (cJSON_IsNumber(item))
        lv_obj_set_style_pad_all(obj, item->valueint, sel);

    /* four-direction padding */
    item = cJSON_GetObjectItemCaseSensitive(style, "paddingTop");
    if (cJSON_IsNumber(item)) lv_obj_set_style_pad_top(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "paddingBottom");
    if (cJSON_IsNumber(item)) lv_obj_set_style_pad_bottom(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "paddingLeft");
    if (cJSON_IsNumber(item)) lv_obj_set_style_pad_left(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "paddingRight");
    if (cJSON_IsNumber(item)) lv_obj_set_style_pad_right(obj, item->valueint, sel);

    /* shadow */
    s = cjson_get_string(style, "shadowColor");
    if (s) lv_obj_set_style_shadow_color(obj, hex_to_color(s), sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "shadowWidth");
    if (cJSON_IsNumber(item)) lv_obj_set_style_shadow_width(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "shadowOffsetX");
    if (cJSON_IsNumber(item)) lv_obj_set_style_shadow_offset_x(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "shadowOffsetY");
    if (cJSON_IsNumber(item)) lv_obj_set_style_shadow_offset_y(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "shadowSpread");
    if (cJSON_IsNumber(item)) lv_obj_set_style_shadow_spread(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "shadowOpacity");
    if (cJSON_IsNumber(item)) lv_obj_set_style_shadow_opa(obj, (lv_opa_t)item->valueint, sel);

    /* background gradient */
    s = cjson_get_string(style, "bgGradColor");
    if (s) lv_obj_set_style_bg_grad_color(obj, hex_to_color(s), sel);
    s = cjson_get_string(style, "bgGradDir");
    if (s) {
        if (strcmp(s, "hor") == 0) lv_obj_set_style_bg_grad_dir(obj, LV_GRAD_DIR_HOR, sel);
        else if (strcmp(s, "ver") == 0) lv_obj_set_style_bg_grad_dir(obj, LV_GRAD_DIR_VER, sel);
    }

    /* outline */
    s = cjson_get_string(style, "outlineColor");
    if (s) lv_obj_set_style_outline_color(obj, hex_to_color(s), sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "outlineWidth");
    if (cJSON_IsNumber(item)) lv_obj_set_style_outline_width(obj, item->valueint, sel);
    item = cJSON_GetObjectItemCaseSensitive(style, "outlinePad");
    if (cJSON_IsNumber(item)) lv_obj_set_style_outline_pad(obj, item->valueint, sel);
}

static void apply_styles(lv_obj_t *obj, const cJSON *styles) {
    if (!styles) return;
    apply_style_state(obj, cJSON_GetObjectItemCaseSensitive(styles, "default"), LV_PART_MAIN | LV_STATE_DEFAULT);
    apply_style_state(obj, cJSON_GetObjectItemCaseSensitive(styles, "pressed"), LV_PART_MAIN | LV_STATE_PRESSED);
    apply_style_state(obj, cJSON_GetObjectItemCaseSensitive(styles, "focused"), LV_PART_MAIN | LV_STATE_FOCUSED);
    apply_style_state(obj, cJSON_GetObjectItemCaseSensitive(styles, "disabled"), LV_PART_MAIN | LV_STATE_DISABLED);
}

/* ------------------------------------------------------------------ */
/*  ID map – so children can find their parent by id string            */
/* ------------------------------------------------------------------ */

#define MAX_COMPONENTS 256

typedef struct {
    char id[64];
    lv_obj_t *obj;
} id_map_entry_t;

static id_map_entry_t id_map[MAX_COMPONENTS];
static int id_map_count = 0;

static void id_map_reset(void) { id_map_count = 0; }

static void id_map_add(const char *id, lv_obj_t *obj) {
    if (id_map_count >= MAX_COMPONENTS) return;
    strncpy(id_map[id_map_count].id, id, 63);
    id_map[id_map_count].id[63] = '\0';
    id_map[id_map_count].obj = obj;
    id_map_count++;
}

static lv_obj_t *id_map_find(const char *id) {
    if (!id) return NULL;
    for (int i = 0; i < id_map_count; i++) {
        if (strcmp(id_map[i].id, id) == 0) return id_map[i].obj;
    }
    return NULL;
}

/* ------------------------------------------------------------------ */
/*  Component creators                                                 */
/* ------------------------------------------------------------------ */

static lv_obj_t *create_obj(lv_obj_t *parent, const cJSON *comp) {
    (void)comp;
    return lv_obj_create(parent);
}

static lv_obj_t *create_btn(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *btn = lv_button_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) {
            lv_obj_t *lbl = lv_label_create(btn);
            lv_label_set_text(lbl, text);
            lv_obj_center(lbl);
        }
    }
    return btn;
}

static lv_obj_t *create_label(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *lbl = lv_label_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) lv_label_set_text(lbl, text);
    }
    return lbl;
}

static lv_obj_t *create_slider(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *slider = lv_slider_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 50);
        lv_slider_set_range(slider, mn, mx);
        lv_slider_set_value(slider, val, LV_ANIM_OFF);
    }
    return slider;
}

static lv_obj_t *create_bar(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *bar = lv_bar_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 50);
        lv_bar_set_range(bar, mn, mx);
        lv_bar_set_value(bar, val, LV_ANIM_OFF);
    }
    return bar;
}

static lv_obj_t *create_arc(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *arc = lv_arc_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int mn = cjson_get_int(props, "min", 0);
        int mx = cjson_get_int(props, "max", 100);
        int val = cjson_get_int(props, "value", 75);
        lv_arc_set_range(arc, mn, mx);
        lv_arc_set_value(arc, val);
    }
    return arc;
}

static lv_obj_t *create_switch(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *sw = lv_switch_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int checked = cjson_get_bool(props, "checked", 0);
        if (checked) lv_obj_add_state(sw, LV_STATE_CHECKED);
    }
    return sw;
}

static lv_obj_t *create_checkbox(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *cb = lv_checkbox_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text) lv_checkbox_set_text(cb, text);
        int checked = cjson_get_bool(props, "checked", 0);
        if (checked) lv_obj_add_state(cb, LV_STATE_CHECKED);
    }
    return cb;
}

static lv_obj_t *create_dropdown(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *dd = lv_dropdown_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        cJSON *options = cJSON_GetObjectItemCaseSensitive(props, "options");
        if (cJSON_IsArray(options)) {
            /* Build newline-separated options string */
            char buf[512] = {0};
            int first = 1;
            cJSON *opt;
            cJSON_ArrayForEach(opt, options) {
                if (cJSON_IsString(opt)) {
                    if (!first) strncat(buf, "\n", sizeof(buf) - strlen(buf) - 1);
                    strncat(buf, opt->valuestring, sizeof(buf) - strlen(buf) - 1);
                    first = 0;
                }
            }
            lv_dropdown_set_options(dd, buf);
        }
        int sel = cjson_get_int(props, "selected", 0);
        lv_dropdown_set_selected(dd, (uint32_t)sel);
    }
    return dd;
}

static lv_obj_t *create_textarea(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *ta = lv_textarea_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *text = cjson_get_string(props, "text");
        if (text && text[0]) lv_textarea_set_text(ta, text);
        const char *ph = cjson_get_string(props, "placeholder");
        if (ph) lv_textarea_set_placeholder_text(ta, ph);
    }
    return ta;
}

static lv_obj_t *create_table(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *tbl = lv_table_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int rows = cjson_get_int(props, "rows", 3);
        int cols = cjson_get_int(props, "cols", 3);
        lv_table_set_row_count(tbl, (uint32_t)rows);
        lv_table_set_column_count(tbl, (uint32_t)cols);
        /* Fill header row */
        for (int c = 0; c < cols; c++) {
            char hdr[32];
            snprintf(hdr, sizeof(hdr), "Col %d", c + 1);
            lv_table_set_cell_value(tbl, 0, (uint32_t)c, hdr);
        }
    }
    return tbl;
}

static lv_obj_t *create_chart(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *chart = lv_chart_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        const char *type_str = cjson_get_string(props, "type");
        if (type_str && strcmp(type_str, "bar") == 0)
            lv_chart_set_type(chart, LV_CHART_TYPE_BAR);
        else
            lv_chart_set_type(chart, LV_CHART_TYPE_LINE);

        cJSON *data = cJSON_GetObjectItemCaseSensitive(props, "data");
        if (cJSON_IsArray(data)) {
            int cnt = cJSON_GetArraySize(data);
            lv_chart_set_point_count(chart, (uint32_t)cnt);
            lv_chart_series_t *ser = lv_chart_add_series(chart, lv_color_hex(0x2196F3), LV_CHART_AXIS_PRIMARY_Y);
            cJSON *val;
            cJSON_ArrayForEach(val, data) {
                if (cJSON_IsNumber(val))
                    lv_chart_set_next_value(chart, ser, val->valueint);
            }
        }
    }
    return chart;
}

static lv_obj_t *create_calendar(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *cal = lv_calendar_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    if (props) {
        int year = cjson_get_int(props, "year", 2026);
        int month = cjson_get_int(props, "month", 1);
        lv_calendar_set_today_date(cal, (uint32_t)year, (uint32_t)month, 1);
        lv_calendar_set_showed_date(cal, (uint32_t)year, (uint32_t)month);
    }
    return cal;
}

static lv_obj_t *create_tabview(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *tv = lv_tabview_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    const char *comp_id = cjson_get_string(comp, "id");
    if (props) {
        /* Set tab bar position */
        const char *pos = cjson_get_string(props, "tabPosition");
        if (pos) {
            lv_dir_t dir = LV_DIR_TOP;
            if (strcmp(pos, "bottom") == 0) dir = LV_DIR_BOTTOM;
            else if (strcmp(pos, "left") == 0) dir = LV_DIR_LEFT;
            else if (strcmp(pos, "right") == 0) dir = LV_DIR_RIGHT;
            lv_tabview_set_tab_bar_position(tv, dir);
        }
        int tab_size = cjson_get_int(props, "tabBarSize", 50);
        lv_tabview_set_tab_bar_size(tv, tab_size);

        cJSON *tabs = cJSON_GetObjectItemCaseSensitive(props, "tabs");
        if (cJSON_IsArray(tabs)) {
            int idx = 0;
            cJSON *tab;
            cJSON_ArrayForEach(tab, tabs) {
                if (cJSON_IsString(tab)) {
                    lv_obj_t *page = lv_tabview_add_tab(tv, tab->valuestring);
                    /* Register tab page with virtual ID so children can find it */
                    if (comp_id && page) {
                        char vid[128];
                        snprintf(vid, sizeof(vid), "%s__tab__%d", comp_id, idx);
                        id_map_add(vid, page);
                    }
                    idx++;
                }
            }
        }
        int active = cjson_get_int(props, "activeTab", 0);
        lv_tabview_set_active(tv, (uint32_t)active, LV_ANIM_OFF);
    }
    return tv;
}

static lv_obj_t *create_tileview(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *tv = lv_tileview_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    const char *comp_id = cjson_get_string(comp, "id");
    if (props) {
        int rows = cjson_get_int(props, "rows", 2);
        int cols = cjson_get_int(props, "cols", 2);
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                lv_obj_t *tile = lv_tileview_add_tile(tv, (uint8_t)c, (uint8_t)r, LV_DIR_ALL);
                /* Register tile with virtual ID */
                if (comp_id && tile) {
                    char vid[128];
                    snprintf(vid, sizeof(vid), "%s__tile__%d-%d", comp_id, r, c);
                    id_map_add(vid, tile);
                }
            }
        }
        int cr = cjson_get_int(props, "currentRow", 0);
        int cc = cjson_get_int(props, "currentCol", 0);
        lv_tileview_set_tile_by_index(tv, (uint32_t)cc, (uint32_t)cr, LV_ANIM_OFF);
    }
    return tv;
}

static lv_obj_t *create_win(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *win = lv_win_create(parent);
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    const char *comp_id = cjson_get_string(comp, "id");
    if (props) {
        const char *title = cjson_get_string(props, "title");
        if (title) lv_win_add_title(win, title);
    }
    /* Register win content area with virtual ID */
    if (comp_id) {
        lv_obj_t *content = lv_win_get_content(win);
        if (content) {
            char vid[128];
            snprintf(vid, sizeof(vid), "%s__win_content", comp_id);
            id_map_add(vid, content);
        }
    }
    return win;
}

static lv_obj_t *create_spinner(lv_obj_t *parent, const cJSON *comp) {
    (void)comp;
    return lv_spinner_create(parent);
}

static lv_obj_t *create_line(lv_obj_t *parent, const cJSON *comp) {
    lv_obj_t *line = lv_line_create(parent);
    /* Default horizontal line */
    static lv_point_precise_t line_points[2];
    const cJSON *props = cJSON_GetObjectItemCaseSensitive(comp, "props");
    int w = cjson_get_int(comp, "width", 100);
    line_points[0].x = 0; line_points[0].y = 0;
    line_points[1].x = w; line_points[1].y = 0;

    if (props) {
        cJSON *pts = cJSON_GetObjectItemCaseSensitive(props, "points");
        if (cJSON_IsArray(pts) && cJSON_GetArraySize(pts) >= 2) {
            cJSON *p0 = cJSON_GetArrayItem(pts, 0);
            cJSON *p1 = cJSON_GetArrayItem(pts, 1);
            if (cJSON_IsArray(p0) && cJSON_IsArray(p1)) {
                line_points[0].x = cJSON_GetArrayItem(p0, 0)->valueint;
                line_points[0].y = cJSON_GetArrayItem(p0, 1)->valueint;
                line_points[1].x = cJSON_GetArrayItem(p1, 0)->valueint;
                line_points[1].y = cJSON_GetArrayItem(p1, 1)->valueint;
            }
        }
    }
    lv_line_set_points(line, line_points, 2);
    return line;
}

static lv_obj_t *create_img(lv_obj_t *parent, const cJSON *comp) {
    (void)comp;
    /* Image source handling would require asset management;
       for now just create the widget */
    return lv_image_create(parent);
}

/* ------------------------------------------------------------------ */
/*  Dispatch table                                                     */
/* ------------------------------------------------------------------ */

typedef lv_obj_t *(*creator_fn)(lv_obj_t *parent, const cJSON *comp);

typedef struct {
    const char *type;
    creator_fn  fn;
} type_entry_t;

static const type_entry_t type_table[] = {
    { "obj",       create_obj },
    { "panel",     create_obj },
    { "container", create_obj },
    { "btn",       create_btn },
    { "label",     create_label },
    { "slider",    create_slider },
    { "bar",       create_bar },
    { "arc",       create_arc },
    { "switch",    create_switch },
    { "checkbox",  create_checkbox },
    { "dropdown",  create_dropdown },
    { "textarea",  create_textarea },
    { "table",     create_table },
    { "chart",     create_chart },
    { "calendar",  create_calendar },
    { "tabview",   create_tabview },
    { "tileview",  create_tileview },
    { "win",       create_win },
    { "spinner",   create_spinner },
    { "line",      create_line },
    { "img",       create_img },
    { NULL, NULL }
};

static creator_fn find_creator(const char *type) {
    for (int i = 0; type_table[i].type; i++) {
        if (strcmp(type_table[i].type, type) == 0)
            return type_table[i].fn;
    }
    return NULL;
}

/* ------------------------------------------------------------------ */
/*  Main entry – two-pass: create all, then reparent children          */
/* ------------------------------------------------------------------ */

void ui_from_json(const char *json_str) {
    if (!json_str) return;

    cJSON *root = cJSON_Parse(json_str);
    if (!root) return;

    lv_obj_t *screen = lv_screen_active();
    id_map_reset();

    /* Apply screen settings */
    cJSON *scr_cfg = cJSON_GetObjectItemCaseSensitive(root, "screen");
    if (scr_cfg) {
        const char *bg = cjson_get_string(scr_cfg, "bgColor");
        if (bg) {
            lv_obj_set_style_bg_color(screen, hex_to_color(bg), LV_PART_MAIN);
            lv_obj_set_style_bg_opa(screen, LV_OPA_COVER, LV_PART_MAIN);
        }
    }

    /* Pass 1: create all components on screen first */
    cJSON *components = cJSON_GetObjectItemCaseSensitive(root, "components");
    if (!cJSON_IsArray(components)) { cJSON_Delete(root); return; }

    cJSON *comp;
    cJSON_ArrayForEach(comp, components) {
        const char *type = cjson_get_string(comp, "type");
        const char *id   = cjson_get_string(comp, "id");
        if (!type) continue;

        /* Determine parent */
        const char *parent_id = cjson_get_string(comp, "parent");
        lv_obj_t *parent = screen;
        if (parent_id) {
            lv_obj_t *p = id_map_find(parent_id);
            if (p) parent = p;
        }

        /* Create widget */
        creator_fn fn = find_creator(type);
        lv_obj_t *obj;
        if (fn) {
            obj = fn(parent, comp);
        } else {
            obj = lv_obj_create(parent);
        }

        if (!obj) continue;

        /* Position & size */
        int x = cjson_get_int(comp, "x", 0);
        int y = cjson_get_int(comp, "y", 0);
        int w = cjson_get_int(comp, "width", LV_SIZE_CONTENT);
        int h = cjson_get_int(comp, "height", LV_SIZE_CONTENT);
        lv_obj_set_pos(obj, x, y);
        lv_obj_set_size(obj, w, h);

        /* Apply styles */
        cJSON *styles = cJSON_GetObjectItemCaseSensitive(comp, "styles");
        apply_styles(obj, styles);

        /* Flags */
        cJSON *flags = cJSON_GetObjectItemCaseSensitive(comp, "flags");
        if (flags) {
            if (cjson_get_bool(flags, "hidden", 0)) lv_obj_add_flag(obj, LV_OBJ_FLAG_HIDDEN);
            if (!cjson_get_bool(flags, "clickable", 1)) lv_obj_remove_flag(obj, LV_OBJ_FLAG_CLICKABLE);
            if (!cjson_get_bool(flags, "scrollable", 1)) lv_obj_remove_flag(obj, LV_OBJ_FLAG_SCROLLABLE);
        }

        /* Register in id map */
        if (id) id_map_add(id, obj);
    }

    cJSON_Delete(root);
}
