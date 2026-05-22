// Copyright (c) 2026, r and contributors
// For license information, please see license.txt

frappe.query_reports["Attendance Report"] = {
	"filters": [
        {
            fieldname:  "from_date",
            label:      __("From Date"),
            fieldtype:  "Date",
            default:    frappe.datetime.month_start(),   // first day of current month
            reqd:       1,
        },
        {
            fieldname:  "to_date",
            label:      __("To Date"),
            fieldtype:  "Date",
            default:    frappe.datetime.month_end(),     // last day of current month
            reqd:       1,
        },
        {
            fieldname:  "employee",
            label:      __("Employee"),
            fieldtype:  "Link",
            options:    "Employee",
            reqd:       0,
        },
        {
            fieldname:  "department",
            label:      __("Department"),
            fieldtype:  "Link",
            options:    "Department",
            reqd:       0,
        },
        {
            fieldname:  "branch",
            label:      __("Branch"),
            fieldtype:  "Link",
            options:    "Branch",
            reqd:       0,
        },
    ],

    // -----------------------------------------------------------------------
    // Formatter  –  style IN cells green, OUT cells red, empty cells grey
    // -----------------------------------------------------------------------
    formatter(value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        if (!data) return value;

        const fn = column.fieldname || "";

        if (fn.startsWith("in_")) {
            // First IN of the day → green badge
            if (data[fn]) {
                value = `<span style="
                    color:#1a7f3c;
                    font-weight:600;
                    background:#d6f5e3;
                    padding:2px 6px;
                    border-radius:4px;">
                    ${data[fn]}
                </span>`;
            } else {
                value = `<span style="color:#aaa;">—</span>`;
            }
        } else if (fn.startsWith("out_")) {
            // First OUT of the day → red badge
            if (data[fn]) {
                value = `<span style="
                    color:#c0392b;
                    font-weight:600;
                    background:#fde8e8;
                    padding:2px 6px;
                    border-radius:4px;">
                    ${data[fn]}
                </span>`;
            } else {
                value = `<span style="color:#aaa;">—</span>`;
            }
        } else if (fn === "total_hours") {
            if (data[fn]) {
                value = `<b style="color:#2c5282;">${data[fn]}</b>`;
            }
        }

        return value;
    },

    // -----------------------------------------------------------------------
    // After refresh hook  –  merge date header cells across IN / OUT columns
    // -----------------------------------------------------------------------
    onload(report) {
        // We use a MutationObserver so we can apply the header merge
        // once Datatable has rendered the DOM.
        const observer = new MutationObserver(() => {
            mergeDateHeaders(report);
        });

        const container = report.wrapper && report.wrapper[0];
        if (container) {
            observer.observe(container, { childList: true, subtree: true });
        }
    },
};

// ---------------------------------------------------------------------------
// Helper: merge neighbouring IN / OUT column headers into a single date header
// ---------------------------------------------------------------------------
function mergeDateHeaders(report) {
    // Frappe's Datatable renders two rows of column headers when
    // column.id contains an underscore group prefix.  We piggyback on
    // the column fieldnames (in_YYYY-MM-DD / out_YYYY-MM-DD) to inject
    // a top row that shows only the date spanning both sub-columns.

    const table = report.wrapper && report.wrapper.find(".dt-header");
    if (!table || !table.length) return;

    // Avoid double-injection
    if (table.find(".date-group-header").length) return;

    const headerRow = table.find(".dt-row").first();
    if (!headerRow.length) return;

    const cells = headerRow.find(".dt-cell--header");
    if (!cells.length) return;

    // Build a new <tr> with merged date cells
    let newRow = `<tr class="date-group-header" style="background:#f0f4ff;">`;
    let skip   = false;

    cells.each(function(i, cell) {
        const label = $(cell).text().trim();
        const match = label.match(/^(\d{2}\/\d{2}\/\d{2})\s+(IN|OUT)$/);

        if (match) {
            if (!skip) {
                // First of pair → render merged cell spanning 2 columns
                newRow += `<th colspan="2" style="
                    text-align:center;
                    font-weight:700;
                    font-size:12px;
                    color:#2d3748;
                    padding:4px 0;
                    border-right:1px solid #cbd5e0;">
                    ${match[1]}
                </th>`;
                skip = true;        // skip the OUT sibling
            } else {
                skip = false;       // consumed the skip
            }
        } else {
            // Non-date column (Employee, Designation, Total)
            newRow += `<th style="padding:4px 6px;"></th>`;
        }
    });

    newRow += "</tr>";
    headerRow.before(newRow);
}
	