frappe.query_reports["Salary Details"] = {
    filters: [
			{
			fieldname: "month",
			label: "Month",
			fieldtype: "Select",
			options: [
				"January",
				"February",
				"March",
				"April",
				"May",
				"June",
				"July",
				"August",
				"September",
				"October",
				"November",
				"December"
			],
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