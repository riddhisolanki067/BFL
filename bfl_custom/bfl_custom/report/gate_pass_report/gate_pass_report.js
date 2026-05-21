// Copyright (c) 2026, Your Company
// Gate Pass Report - JS Filters

frappe.query_reports["Gate Pass Report"] = {
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
            fieldname: "type",
            label: __("Movement Type"),
            fieldtype: "Select",
            options: "\nIN\nOUT",
        },
        {
            fieldname: "entry_type",
            label: __("Entry Type"),
            fieldtype: "Select",
            options: "\nOUT-NON RETURNABLE\nOUT-RETURNABLE",
        },
        {
            fieldname: "party",
            label: __("Party"),
            fieldtype: "Data",
            // Change to "Link" with options: "Supplier" or "Customer" if applicable
        },
        {
            fieldname: "vehicle_number",
            label: __("Vehicle No"),
            fieldtype: "Data",
        },
        {
            fieldname: "item",
            label: __("Item"),
            fieldtype: "Link",
            options: "Item",
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

        if (column.fieldname === "movement_type") {
            if (data && data.movement_type === "OUT") {
                value = `<span style="color: #e74c3c; font-weight: bold;">${value}</span>`;
            } else if (data && data.movement_type === "IN") {
                value = `<span style="color: #27ae60; font-weight: bold;">${value}</span>`;
            }
        }

        if (column.fieldname === "returnable_status") {
            if (data && data.returnable_status === "Returnable") {
                value = `<span style="color: #2980b9;">${value}</span>`;
            } else if (data && data.returnable_status === "Non Returnable") {
                value = `<span style="color: #e67e22;">${value}</span>`;
            }
        }

        return value;
    },
};