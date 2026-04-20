frappe.query_reports["Salary Details"] = {
    filters: [
        {
            fieldname: "month",
            label: "Month",
            fieldtype: "Data",
            reqd: 1
        },
        {
            fieldname: "employee",
            label: "Employee",
            fieldtype: "Link",
            options: "Employee"
        }
    ]
};