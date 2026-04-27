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
            reqd: 1
        },
        {
            fieldname: "type",
            label: __("Type"),
            fieldtype: "Select",
            options: "\nWeekly Salary\nAdvance Salary\nAdvance\nLoan",
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

    formatter(value, row, column, data, default_formatter) {
        if (!data || !data.employee) {
            return default_formatter(value, row, column, data);
        }

        const eid = data.employee;

        if (!_salary_row_data[eid]) {
            _salary_row_data[eid] = {
                days_present: flt(data.days_present),
                per_day_salary: flt(data.per_day_salary),
                other_addings: flt(data.other_addings),
                other_deduction: flt(data.other_deduction),
                advance_amount: flt(data.advance_amount),
                loan_amount: flt(data.loan_amount),
                deduction_amount: flt(data.deduction_amount),
            };
        }

        const rv = _salary_row_data[eid];
        const computed = calc_all(rv);

        if (EDITABLE_FIELDS.includes(column.fieldname)) {
            return `<input
                type="number"
                class="salary-editable-input"
                data-employee="${eid}"
                data-field="${column.fieldname}"
                value="${rv[column.fieldname] || 0}"
                min="0"
                step="any"
                style="width:100%; text-align:right;"
            >`;
        }

        if (column.fieldname === "total_salary") {
            return fmt_currency(computed.total_salary);
        }
        if (column.fieldname === "amount") {
            return fmt_currency(computed.amount);
        }
        if (column.fieldname === "total_payable") {
            return fmt_currency(computed.total_payable);
        }
        if (column.fieldname === "balance") {
            const color = computed.balance < 0
                ? "color:#e53935;font-weight:700;"
                : "color:#2e7d32;font-weight:600;";
            return `<span style="${color}">${fmt_currency(computed.balance)}</span>`;
        }

        return default_formatter(value, row, column, data);
    },

    after_datatable_render(datatable) {
        setup_input_handlers();
    }
};

function flt(v) {
    return parseFloat(v) || 0;
}

function fmt_currency(v) {
    return frappe.format(v, { fieldtype: "Currency" });
}

function calc_all(rv) {
    const total_salary = flt(rv.days_present) * flt(rv.per_day_salary);
    const amount = flt(rv.other_addings) - flt(rv.other_deduction);
    const total_payable = total_salary + amount;
    const balance = total_payable - flt(rv.advance_amount) - flt(rv.loan_amount) - flt(rv.deduction_amount);

    return { total_salary, amount, total_payable, balance };
}

function setup_input_handlers() {
    $(document).off("input.salary", ".salary-editable-input");

    $(document).on("input.salary", ".salary-editable-input", function () {
        const eid = $(this).data("employee");
        const field = $(this).data("field");
        const value = flt($(this).val());

        if (!_salary_row_data[eid]) return;

        _salary_row_data[eid][field] = value;

        frappe.query_report.render_datatable();
    });
}