frappe.query_reports["Packing Production Details"] = {
    "filters": [
        {
            fieldname: "item",
            label: "Item",
            fieldtype: "Link",
            options: "Item"
        },
        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date"
        },
        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date"
        }
    ]
};