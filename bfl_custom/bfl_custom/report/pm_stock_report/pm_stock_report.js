frappe.query_reports["PM Stock Report"] = {
    filters: [
        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date",
            reqd: 1
        },
        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date",
            reqd: 1
        },
        {
            fieldname: "bom",
            label: "BOM",
            fieldtype: "Link",
            options: "BOM",
            reqd: 1
        },
        {
            fieldname: "item",
            label: "Item",
            fieldtype: "Link",
            options: "Item"
        },
        {
            fieldname: "item_group",
            label: "Item Group",
            fieldtype: "Link",
            options: "Item Group"
        }
    ],

    onload(report) {
        report.page.add_inner_button("Recalculate Wastage", () => {
            recalculate_wastage(report);
        });
    },

    after_datatable_render(report) {
        make_editable(report);
    }
};


// ✅ Make editable + live calculation
function make_editable(report) {
    if (!report.datatable) return;

    report.datatable.options.editable = true;

    report.datatable.on('cell-edit', (cell) => {
        const rowIndex = cell.rowIndex;
        const colIndex = cell.colIndex;

        const column = report.datatable.getColumns()[colIndex];
        const row = report.data[rowIndex];

        if (column.fieldname === "actual_stock") {
            const actual = flt(cell.value);
            const balance = flt(row.balance_stock);

            row.actual_stock = actual;
            row.wastage = balance - actual;

            report.refresh();
        }
    });
}


// ✅ FIXED recalculation (uses report.data correctly)
function recalculate_wastage(report) {
    if (!report.data) return;

    report.data.forEach(row => {
        row.wastage = flt(row.balance_stock) - flt(row.actual_stock);
    });

    report.refresh();
}