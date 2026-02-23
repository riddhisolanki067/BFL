frappe.query_reports["Journal Entry Custom"] = {
    filters: [
        {
            fieldname: "account",
            label: "Account",
            fieldtype: "Link",
            options: "Account",
            reqd: 1
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
        },
        {
            fieldname: "year",
            label: "Year",
            fieldtype: "Int",
            default: new Date().getFullYear()
        },
        {
            fieldname: "month",
            label: "Month",
            fieldtype: "Select",
            options: [
                "",
                "January","February","March","April","May","June",
                "July","August","September","October","November","December"
            ]
        }
    ]
};