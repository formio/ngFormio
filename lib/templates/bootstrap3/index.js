"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var resize_observer_polyfill_1 = require("resize-observer-polyfill");
var builder_1 = require("./builder");
var builderComponent_1 = require("./builderComponent");
var builderComponents_1 = require("./builderComponents");
var builderEditForm_1 = require("./builderEditForm");
var builderPlaceholder_1 = require("./builderPlaceholder");
var builderSidebar_1 = require("./builderSidebar");
var builderSidebarGroup_1 = require("./builderSidebarGroup");
var columns_1 = require("./columns");
var cssClasses_1 = require("./cssClasses");
var datagrid_1 = require("./datagrid");
var day_1 = require("./day");
var dialog_1 = require("./dialog");
var editgrid_1 = require("./editgrid");
var field_1 = require("./field");
var file_1 = require("./file");
var icon_1 = require("./icon");
var iconClass_1 = require("./iconClass");
var input_1 = require("./input");
var label_1 = require("./label");
var message_1 = require("./message");
var modaldialog_1 = require("./modaldialog");
var modaledit_1 = require("./modaledit");
var multiValueRow_1 = require("./multiValueRow");
var multiValueTable_1 = require("./multiValueTable");
var panel_1 = require("./panel");
var radio_1 = require("./radio");
var resourceAdd_1 = require("./resourceAdd");
var signature_1 = require("./signature");
var survey_1 = require("./survey");
var tab_1 = require("./tab");
var table_1 = require("./table");
var warning_1 = require("./warning");
var well_1 = require("./well");
var wizard_1 = require("./wizard");
var wizardHeader_1 = require("./wizardHeader");
var wizardNav_1 = require("./wizardNav");
exports.default = {
    transform: function (type, text) {
        if (!text) {
            return text;
        }
        switch (type) {
            case 'class':
                return this.cssClasses.hasOwnProperty(text.toString()) ? this.cssClasses[text.toString()] : text;
        }
        return text;
    },
    handleBuilderSidebarScroll: function (builder) {
        if (builder.scrollResizeObserver) {
            builder.scrollResizeObserver.disconnect();
        }
        builder.scrollResizeObserver = new resize_observer_polyfill_1.default(function () {
            setTimeout(function () {
                var _a = builder.refs, formHeight = _a.form.parentNode.clientHeight, _b = _a.sidebar, sidebarHeight = _b.clientHeight, style = _b.parentNode.style;
                style.height = Math.max(sidebarHeight + 20, formHeight) + "px";
            });
        });
        builder.scrollResizeObserver.observe(builder.refs.form);
        builder.scrollResizeObserver.observe(builder.refs.sidebar);
    },
    clearBuilderSidebarScroll: function (builder) {
        if (builder.scrollResizeObserver) {
            builder.scrollResizeObserver.disconnect();
            builder.scrollResizeObserver = null;
        }
    },
    defaultIconset: 'glyphicon',
    iconClass: iconClass_1.default,
    cssClasses: cssClasses_1.default,
    builder: builder_1.default,
    builderComponent: builderComponent_1.default,
    builderComponents: builderComponents_1.default,
    builderEditForm: builderEditForm_1.default,
    builderPlaceholder: builderPlaceholder_1.default,
    builderSidebar: builderSidebar_1.default,
    builderSidebarGroup: builderSidebarGroup_1.default,
    columns: columns_1.default,
    datagrid: datagrid_1.default,
    day: day_1.default,
    dialog: dialog_1.default,
    editgrid: editgrid_1.default,
    field: field_1.default,
    file: file_1.default,
    icon: icon_1.default,
    input: input_1.default,
    label: label_1.default,
    message: message_1.default,
    modaldialog: modaldialog_1.default,
    modaledit: modaledit_1.default,
    multiValueRow: multiValueRow_1.default,
    multiValueTable: multiValueTable_1.default,
    panel: panel_1.default,
    radio: radio_1.default,
    resourceAdd: resourceAdd_1.default,
    signature: signature_1.default,
    survey: survey_1.default,
    tab: tab_1.default,
    table: table_1.default,
    warning: warning_1.default,
    well: well_1.default,
    wizard: wizard_1.default,
    wizardHeader: wizardHeader_1.default,
    wizardNav: wizardNav_1.default,
};
