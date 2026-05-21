# Copyright (c) 2026, Your Company
# Gate Pass Report - Frappe/ERPNext Script Report

import frappe
from frappe import _
from frappe.utils import getdate


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {
            "label": _("Sr No"),
            "fieldname": "sr_no",
            "fieldtype": "Int",
            "width": 60,
        },
        {
            "label": _("Date"),
            "fieldname": "date",
            "fieldtype": "Date",
            "width": 100,
        },
        {
            "label": _("Gate Pass No"),
            "fieldname": "gate_pass_no",
            "fieldtype": "Link",
            "options": "GATE ENTRY",
            "width": 120,
        },
        {
            "label": _("supplier Name"),
            "fieldname": "supplier_name",
            "fieldtype": "Data",
            "width": 150,
        },
        {
            "label": _("Vehicle No"),
            "fieldname": "vehicle_number",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": _("Material Description"),
            "fieldname": "product",
            "fieldtype": "Data",
            "width": 180,
        },
        {
            "label": _("Qty"),
            "fieldname": "qty",
            "fieldtype": "Float",
            "width": 80,
        },
        {
            "label": _("Unit"),
            "fieldname": "no_of_package",
            "fieldtype": "Data",
            "width": 60,
        },
        {
            "label": _("Movement Type"),
            "fieldname": "entry_type",
            "fieldtype": "Data",
            "width": 110,
        },
        {
            "label": _("Returnable Status"),
            "fieldname": "type",
            "fieldtype": "Data",
            "width": 130,
        },
        {
            "label": _("In/Out Time"),
            "fieldname": "gate_out_time",
            "fieldtype": "Data",
            "width": 100,
        },
       
        {
            "label": _("Remarks"),
            "fieldname": "remarks",
            "fieldtype": "Data",
            "width": 150,
        },
        {
            "label": _("Purchase/Sale Invoice No"),
            "fieldname": "invoice_no",
            "fieldtype": "Data",
            "width": 160,
        },
    ]


def get_conditions(filters):
    conditions = ""

    if filters.get("from_date"):
        conditions += " AND ge.posting_date >= %(from_date)s"

    if filters.get("to_date"):
        conditions += " AND ge.posting_date <= %(to_date)s"

    if filters.get("type"):
        conditions += " AND ge.entry_type = %(type)s"

    if filters.get("entry_type"):
        conditions += " AND ge.type = %(entry_type)s"

    if filters.get("supplier"):
        conditions += " AND ge.supplier = %(supplier)s"

    if filters.get("vehicle_number"):
        conditions += " AND gev.vehicle_number = %(vehicle_number)s"

    if filters.get("item"):
        conditions += " AND gei.product = %(item)s"

    if filters.get("user"):
        conditions += " AND ge.owner = %(user)s"

    return conditions


def get_data(filters):
    if not filters:
        filters = {}

    conditions = get_conditions(filters)

    query = """
       SELECT
            ge.name                 AS gate_pass_no,
            ge.posting_date                 AS date,
            ge.supplier           AS supplier_name,
            ge.entry_type        AS entry_type,
            ge.type    AS type,
            ge.gate_out_time          AS gate_out_time,
            ge.remarks              AS remarks,
            ge.purchase_invoice           AS invoice_no,
            gei.product    AS product,
            gei.qty               AS qty,
            gei.no_of_package     AS no_of_package,
            gev.vehicle_number   AS vehicle_number
        FROM
            `tabGATE ENTRY` ge
        LEFT JOIN
            `tabGATE ENTRY ITEM` gei ON gei.parent = ge.name
        LEFT JOIN
            `tabGATE ENTRY VEHICLE` gev ON gev.parent = ge.name  
                 WHERE 1=1
        {conditions}
        
    """.format(conditions=conditions)

    raw_data = frappe.db.sql(query, filters, as_dict=True)

    result = []
    for idx, row in enumerate(raw_data, start=1):
        result.append({
            "sr_no": idx,
            "date": row.get("date"),
            "gate_pass_no": row.get("gate_pass_no"),
            "supplier_name": row.get("supplier_name"),
            
            "product": row.get("product"),
            "qty": row.get("qty"),
            "no_of_package": row.get("no_of_package"),
            "entry_type": row.get("entry_type"),
            "type": row.get("type"),
            "gate_out_time": row.get("gate_out_time"),
            "remarks": row.get("remarks"),
            "invoice_no": row.get("invoice_no"),
            "vehicle_number": row.get("vehicle_number"),
        })

    return result