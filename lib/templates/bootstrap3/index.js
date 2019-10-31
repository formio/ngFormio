"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const resize_observer_polyfill_1 = require("resize-observer-polyfill");
const builder_1 = require("./builder");
const builderComponent_1 = require("./builderComponent");
const builderComponents_1 = require("./builderComponents");
const builderEditForm_1 = require("./builderEditForm");
const builderPlaceholder_1 = require("./builderPlaceholder");
const builderSidebar_1 = require("./builderSidebar");
const builderSidebarGroup_1 = require("./builderSidebarGroup");
const columns_1 = require("./columns");
const cssClasses_1 = require("./cssClasses");
const datagrid_1 = require("./datagrid");
const day_1 = require("./day");
const dialog_1 = require("./dialog");
const editgrid_1 = require("./editgrid");
const field_1 = require("./field");
const file_1 = require("./file");
const icon_1 = require("./icon");
const iconClass_1 = require("./iconClass");
const input_1 = require("./input");
const label_1 = require("./label");
const message_1 = require("./message");
const modaldialog_1 = require("./modaldialog");
const modaledit_1 = require("./modaledit");
const multiValueRow_1 = require("./multiValueRow");
const multiValueTable_1 = require("./multiValueTable");
const panel_1 = require("./panel");
const radio_1 = require("./radio");
const resourceAdd_1 = require("./resourceAdd");
const signature_1 = require("./signature");
const survey_1 = require("./survey");
const tab_1 = require("./tab");
const table_1 = require("./table");
const warning_1 = require("./warning");
const well_1 = require("./well");
const wizard_1 = require("./wizard");
const wizardHeader_1 = require("./wizardHeader");
const wizardNav_1 = require("./wizardNav");
exports.default = {
    transform(type, text) {
        if (!text) {
            return text;
        }
        switch (type) {
            case 'class':
                return this.cssClasses.hasOwnProperty(text.toString()) ? this.cssClasses[text.toString()] : text;
        }
        return text;
    },
    handleBuilderSidebarScroll(builder) {
        if (builder.scrollResizeObserver) {
            builder.scrollResizeObserver.disconnect();
        }
        builder.scrollResizeObserver = new resize_observer_polyfill_1.default(() => {
            setTimeout(() => {
                const { form: { parentNode: { clientHeight: formHeight, }, }, sidebar: { clientHeight: sidebarHeight, parentNode: { style, }, }, } = builder.refs;
                style.height = `${Math.max(sidebarHeight + 20, formHeight)}px`;
            });
        });
        builder.scrollResizeObserver.observe(builder.refs.form);
        builder.scrollResizeObserver.observe(builder.refs.sidebar);
    },
    clearBuilderSidebarScroll(builder) {
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
