const _salary_row_data = {};

const COL = {
    employee: 0,
    employee_name: 1,
    type: 2,
    payment_type: 3,
    days_present: 4,
    per_day_salary: 5,
    total_salary: 6,
    other_addings: 7,
    other_deduction: 8,
    amount: 9,
    total_payable: 10,
    advance_date: 11,
    advance_amount: 12,
    loan_date: 13,
    loan_amount: 14,
    deduction_amount: 15,
    balance: 16,
};

const EDITABLE_FIELDS = ["days_present", "other_addings", "other_deduction"];
const CALCULATED_FIELDS = ["total_salary", "amount", "total_payable", "balance"];

frappe.query_reports["Salary Details"] = {
    filters: [
        {
            fieldname: "month",
            label: __("Month"),
            fieldtype: "Select",
            options: "\nJanuary\nFebruary\nMarch\nApril\nMay\nJune\nJuly\nAugust\nSeptember\nOctober\nNovember\nDecember",
            reqd: 1,
            default: get_current_month()
        },
        {
            fieldname: "type",
            label: __("Type"),
            fieldtype: "Select",
            options: "\nAdvance\nLoan",
        },
        {
            fieldname: "payment_type",
            label: __("Payment Type"),
            fieldtype: "Select",
            options: "\nBank\nCash",
        },
        {
            fieldname: "employment_type",
            label: __("Employment Type"),
            fieldtype: "Link",
            options: "Employment Type",
        },
    ],

    onload: function(report) {
        report.page.set_primary_action(
            __("Show Report"),
            () => report.refresh(),
            "fa fa-table"
        );
    },

    formatter: function(value, row, column, data, default_formatter) {
        if (!data) {
            return default_formatter(value, row, column, data);
        }

        const row_key = data.row_key || `${data.employee || ""}__${row || 0}`;

        if (!_salary_row_data[row_key]) {
            _salary_row_data[row_key] = {
                days_present: flt(data.days_present),
                per_day_salary: flt(data.per_day_salary),
                other_addings: flt(data.other_addings),
                other_deduction: flt(data.other_deduction),
                advance_amount: flt(data.advance_amount),
                loan_amount: flt(data.loan_amount),
                deduction_amount: flt(data.deduction_amount),
            };
        }

        const rv = _salary_row_data[row_key];

        if (EDITABLE_FIELDS.includes(column.fieldname)) {
            if (data.is_total_row) {
                return `<span style="font-weight:700;">${value || ""}</span>`;
            }

            const cur = rv[column.fieldname] || 0;

            return `
                <input
                    type="text"
                    inputmode="decimal"
                    class="salary-editable-input"
                    data-row-key="${row_key}"
                    data-field="${column.fieldname}"
                    value="${cur}"
                    style="
                        width: 100%;
                        max-width: 110px;
                        border: 1px solid var(--border-color, #d1d8dd);
                        
                        
                        text-align: right;
                        background: #fff;
                        font-size: 12px;
                    "
                >
            `;
        }

        if (CALCULATED_FIELDS.includes(column.fieldname)) {
            const v = calc(column.fieldname, rv);

            if (data.is_total_row) {
                return `<span style="font-weight:700;">${fmt_currency(v)}</span>`;
            }

            if (column.fieldname === "balance") {
                const color = v < 0
                    ? "color:var(--red-500,#e53935);font-weight:700"
                    : "color:var(--green-600,#2e7d32);font-weight:600";
                return `<span style="${color}">${fmt_currency(v)}</span>`;
            }

            return fmt_currency(v);
        }

        let formatted = default_formatter(value, row, column, data);

        if (data.is_total_row) {
            formatted = `<span style="font-weight:700;">${formatted || ""}</span>`;
        }

        return formatted;
    },

    after_datatable_render: function(datatable) {
        inject_grouped_header(datatable);
        setup_input_handlers(datatable);
    },
};

function calc(fieldname, rv) {
    const total_salary = flt(rv.days_present) * flt(rv.per_day_salary);
    const amount = flt(rv.other_addings) - flt(rv.other_deduction);
    const total_payable = total_salary + amount;
    const balance = total_payable - flt(rv.advance_amount) - flt(rv.loan_amount) - flt(rv.deduction_amount);

    return { total_salary, amount, total_payable, balance }[fieldname] ?? 0;
}

function calc_all(rv) {
    const total_salary = flt(rv.days_present) * flt(rv.per_day_salary);
    const amount = flt(rv.other_addings) - flt(rv.other_deduction);
    const total_payable = total_salary + amount;
    const balance = total_payable - flt(rv.advance_amount) - flt(rv.loan_amount) - flt(rv.deduction_amount);

    return { total_salary, amount, total_payable, balance };
}

function fmt_currency(v) {
    return frappe.format(v || 0, { fieldtype: "Currency" });
}

function flt(v) {
    if (v === null || v === undefined || v === "") return 0;
    v = String(v).replace(/,/g, "").trim();
    return parseFloat(v) || 0;
}

function setup_input_handlers(datatable) {
    const $wrapper = $(datatable.wrapper || datatable.$datatable);
    if (!$wrapper || !$wrapper.length) return;

    $wrapper.off("input.salary change.salary", ".salary-editable-input");

    $wrapper.on("input.salary change.salary", ".salary-editable-input", function () {
        const $input = $(this);
        const row_key = $input.data("row-key");
        const field = $input.data("field");
        const val = flt($input.val());

        if (!_salary_row_data[row_key]) return;

        _salary_row_data[row_key][field] = val;

        const rv = _salary_row_data[row_key];
        const results = calc_all(rv);

        const $cell_in_row = $input.closest("[data-col-index]");
        if (!$cell_in_row.length) return;

        const $row_container = $cell_in_row.parent();
        if (!$row_container.length) return;

        const updates = {
            [COL.total_salary]: fmt_currency(results.total_salary),
            [COL.amount]: fmt_currency(results.amount),
            [COL.total_payable]: fmt_currency(results.total_payable),
            [COL.balance]: (function () {
                const color = results.balance < 0
                    ? "color:var(--red-500,#e53935);font-weight:700"
                    : "color:var(--green-600,#2e7d32);font-weight:600";
                return `<span style="${color}">${fmt_currency(results.balance)}</span>`;
            })(),
        };

        Object.entries(updates).forEach(([col_idx, html]) => {
            const $target = $row_container.find(`[data-col-index="${col_idx}"]`).first();
            if ($target.length) {
                const $content = $target.find(".dt-cell__content, .cell-content");
                ($content.length ? $content : $target).html(html);
            }
        });
    });
}

function inject_grouped_header(datatable) {
    const $wrapper = $(datatable.wrapper || datatable.$datatable);
    if (!$wrapper || !$wrapper.length) return;

    const $thead = $wrapper.find("thead");
    if (!$thead.length) return;

    $thead.find(".salary-group-header").remove();

    const base = "text-align:center;font-weight:700;font-size:11px;padding:5px 4px;white-space:nowrap;border-bottom:2px solid var(--border-color,#d1d8dd);";
    const empty = "border:none;background:transparent;";
    const adv = "background:#fff8e1;color:#5d4037;border-left:2px solid #ffb74d;border-right:2px solid #ffb74d;border-radius:3px 3px 0 0;";
    const loan = "background:#e3f2fd;color:#1565c0;border-left:2px solid #64b5f6;border-right:2px solid #64b5f6;border-radius:3px 3px 0 0;";

    const cells = [
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["", 1, empty],
        ["⬇ Advance", 2, adv],
        ["⬇ Loan", 2, loan],
        ["", 1, empty],
        ["", 1, empty],
    ];

    let html = `<tr class="salary-group-header">`;
    cells.forEach(([label, colspan, extra]) => {
        html += `<th colspan="${colspan}" style="${base}${extra}">${label ? __(label) : ""}</th>`;
    });
    html += `</tr>`;
    $thead.prepend(html);
}

function get_current_month() {
    return [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ][new Date().getMonth()];
}