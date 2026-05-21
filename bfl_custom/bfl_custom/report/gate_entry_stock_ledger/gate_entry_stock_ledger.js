// Copyright (c) 2026, Your Company
// Gate Entry Stock Ledger Report - JS Filters

frappe.query_reports["Gate entry stock ledger"] = {
    filters: [
        {
            fieldname: "from_date",
            label: __("From Date"),
            fieldtype: "Date",
            default: frappe.datetime.month_start(),
            reqd: 0,
        },
        {
            fieldname: "to_date",
            label: __("To Date"),
            fieldtype: "Date",
            default: frappe.datetime.month_end(),
            reqd: 0,
        },
        {
            fieldname: "movement_type",
            label: __("Movement Type"),
            fieldtype: "Select",
            options: "\nIN\nOUT",
        },
        {
            fieldname: "returnable_status",
            label: __("Returnable Status"),
            fieldtype: "Select",
            options: "\nReturnable\nNon Returnable",
        },
        {
            fieldname: "party",
            label: __("Party"),
            fieldtype: "Data",
        },
        {
            fieldname: "vehicle_number",
            label: __("Vehicle No"),
            fieldtype: "Data",
        },
        {
            fieldname: "item",
            label: __("Item"),
            fieldtype: "Data",
        },
        {
            fieldname: "user",
            label: __("User"),
            fieldtype: "Link",
            options: "User",
        },
    ],

    formatter: function (value, row, column, data, default_formatter) {
        value = default_formatter(value, row, column, data);

        // Bold summary rows (TOTAL, STOCK IN FACTORY, STOCK RETURNABLE)
        if (data && data.bold) {
            value = `<strong>${value}</strong>`;
        }

        // Color IN qty green
        if (column.fieldname === "in_qty" && data && data.in_qty > 0) {
            value = `<span style="color: #27ae60; font-weight: bold;">${value}</span>`;
        }

        // Color OUT qty red
        if (column.fieldname === "out_qty" && data && data.out_qty > 0) {
            value = `<span style="color: #e74c3c; font-weight: bold;">${value}</span>`;
        }

        // Color STOCK IN FACTORY label
        if (
            column.fieldname === "vehicle_no" &&
            data &&
            (data.vehicle_no === "STOCK IN FACTORY" ||
                data.vehicle_no === "STOCK RETURNABLE")
        ) {
            value = `<span style="color: #8e44ad; font-weight: bold;">${value}</span>`;
        }

        return value;
    },
};