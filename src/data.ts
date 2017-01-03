'use strict';

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