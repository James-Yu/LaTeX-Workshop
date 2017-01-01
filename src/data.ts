'use strict';

var auto_completions = {};
export function set_auto_completions(new_dict) {
    auto_completions = new_dict;
}
export function get_auto_completions() {
    return auto_completions;
}

var citation_keys = [];
export function set_citation_keys(new_keys) {
    citation_keys = new_keys;
}
export function get_citation_keys() {
    return citation_keys;
}

var label_keys = [];
export function set_label_keys(new_keys) {
    label_keys = new_keys;
}
export function get_label_keys() {
    return label_keys;
}