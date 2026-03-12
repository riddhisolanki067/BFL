// Copyright (c) 2026, r and contributors
// For license information, please see license.txt

frappe.query_reports["Gate In Out Report"] = {
	 "filters": [
        {
            fieldname: "item",
            label: "Item",
            fieldtype: "Link",
            options: "Item",
            width: 200
        },
		{
		fieldname: "purpose",
		fieldtype: "Select",
		label: "PURPOSE",
		options: "MATERIAL REPAIRING\nLOAN GIVEN\nTRANSFER TO SOLIS\nSPARE PURCHASE\nRM PURCHASE\nLoan IN\nLoan Return"
		}
		
    ]
};