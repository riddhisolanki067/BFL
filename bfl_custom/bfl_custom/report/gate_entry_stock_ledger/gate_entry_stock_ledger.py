# Copyright (c) 2026, Your Company
# Gate Entry Stock Ledger Report - Frappe/ERPNext Script Report
# Shows IN / OUT quantities per item with totals, Stock in Factory, Stock Returnable

import frappe
from frappe import _
from frappe.utils import flt


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
            "label": _("Party Name"),
            "fieldname": "party_name",
            "fieldtype": "Data",
            "width": 150,
        },
        {
            "label": _("Vehicle No"),
            "fieldname": "vehicle_no",
            "fieldtype": "Data",
            "width": 120,
        },
        {
            "label": _("Material Description"),
            "fieldname": "material_description",
            "fieldtype": "Data",
            "width": 180,
        },
        # ---- IN columns ----
        {
            "label": _("IN Qty"),
            "fieldname": "in_qty",
            "fieldtype": "Float",
            "width": 80,
        },
        {
            "label": _("IN Unit"),
            "fieldname": "in_unit",
            "fieldtype": "Data",
            "width": 60,
        },
        # ---- OUT columns ----
        {
            "label": _("OUT Qty"),
            "fieldname": "out_qty",
            "fieldtype": "Float",
            "width": 80,
        },
        {
            "label": _("OUT Unit"),
            "fieldname": "out_unit",
            "fieldtype": "Data",
            "width": 60,
        },
        {
            "label": _("Returnable Status"),
            "fieldname": "returnable_status",
            "fieldtype": "Data",
            "width": 130,
        },
        {
            "label": _("In/Out Time"),
            "fieldname": "in_out_time",
            "fieldtype": "Data",
            "width": 100,
        },
        {
            "label": _("Department"),
            "fieldname": "department",
            "fieldtype": "Data",
            "width": 120,
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

    if filters.get("movement_type"):
        conditions += " AND ge.entry_type = %(movement_type)s"

    if filters.get("returnable_status"):
        conditions += " AND ge.type = %(returnable_status)s"

    if filters.get("party"):
        conditions += " AND ge.supplier = %(party)s"

    if filters.get("vehicle_no"):
        conditions += " AND gev.vehicle_number = %(vehicle_no)s"

    if filters.get("item"):
        conditions += " AND gei.product = %(item)s"

    if filters.get("user"):
        conditions += " AND ge.owner = %(user)s"

    return conditions


def get_raw_data(filters):
    conditions = get_conditions(filters)

    query = """
        SELECT
            ge.name                 AS gate_pass_no,
            ge.posting_date                 AS date,
            ge.supplier           AS party_name,
            ge.entry_type        AS movement_type,
            ge.type    AS returnable_status,
            ge.gate_out_time          AS in_out_time,
            ge.remarks              AS remarks,
            ge.purchase_invoice           AS invoice_no,
            gei.product    AS material_description,
            gei.qty                 AS qty,
            gei.no_of_package                AS unit,
            gev.vehicle_number        AS vehicle_no
        FROM
            `tabGATE ENTRY` ge
        LEFT JOIN
            `tabGATE ENTRY ITEM` gei ON gei.parent = ge.name
        LEFT JOIN
            `tabGATE ENTRY VEHICLE` gev ON gev.parent = ge.name
        {conditions}
        
    """.format(conditions=conditions)

    return frappe.db.sql(query, filters, as_dict=True)


def get_data(filters):
    if not filters:
        filters = {}

    raw_data = get_raw_data(filters)

    result = []
    total_in_qty = 0.0
    total_out_qty = 0.0

    # Track per-unit totals for summary lines
    in_unit = ""
    out_unit = ""

    # Totals for Stock in Factory / Stock Returnable
    stock_in_factory = 0.0      # IN Non-Returnable - OUT Non-Returnable
    stock_returnable = 0.0      # IN Returnable (not yet returned)

    returnable_in = 0.0
    returnable_out = 0.0
    non_returnable_out = 0.0

    for idx, row in enumerate(raw_data, start=1):
        qty = flt(row.get("qty"))
        movement = (row.get("movement_type") or "").upper()
        ret_status = row.get("returnable_status") or ""
        unit = row.get("unit") or ""

        in_qty = qty if movement == "IN" else 0.0
        out_qty = qty if movement == "OUT" else 0.0

        total_in_qty += in_qty
        total_out_qty += out_qty

        if in_qty:
            in_unit = unit
        if out_qty:
            out_unit = unit

        # Stock calculations
        if movement == "IN" and ret_status == "Returnable":
            returnable_in += qty
        elif movement == "OUT" and ret_status == "Returnable":
            returnable_out += qty
        elif movement == "OUT" and ret_status == "Non Returnable":
            non_returnable_out += qty

        result.append({
            "sr_no": idx,
            "date": row.get("date"),
            "gate_pass_no": row.get("gate_pass_no"),
            "party_name": row.get("party_name"),
            "vehicle_no": row.get("vehicle_no"),
            "material_description": row.get("material_description"),
            "in_qty": in_qty if in_qty else None,
            "in_unit": unit if in_qty else None,
            "out_qty": out_qty if out_qty else None,
            "out_unit": unit if out_qty else None,
            "returnable_status": ret_status,
            "in_out_time": row.get("in_out_time"),
            "department": row.get("department"),
            "remarks": row.get("remarks"),
            "invoice_no": row.get("invoice_no"),
            "bold": 0,
        })

    if result:
        # --- TOTAL row ---
        result.append({
            "sr_no": None,
            "date": None,
            "gate_pass_no": None,
            "party_name": None,
            "vehicle_no": None,
            "material_description": "TOTAL",
            "in_qty": total_in_qty,
            "in_unit": in_unit,
            "out_qty": total_out_qty,
            "out_unit": out_unit,
            "returnable_status": None,
            "in_out_time": None,
            "department": None,
            "remarks": None,
            "invoice_no": None,
            "bold": 1,
        })

        # Blank separator
        result.append({})

        # --- STOCK IN FACTORY row ---
        # Non-returnable OUT qty represents dispatched goods from factory
        # Stock In Factory = Total IN qty - Non-Returnable OUT qty
        stock_in_factory = total_in_qty - non_returnable_out
        result.append({
            "sr_no": None,
            "date": None,
            "gate_pass_no": None,
            "party_name": None,
            "vehicle_no": "STOCK IN FACTORY",
            "material_description": None,
            "in_qty": stock_in_factory,
            "in_unit": in_unit,
            "out_qty": None,
            "out_unit": None,
            "returnable_status": None,
            "in_out_time": None,
            "department": None,
            "remarks": None,
            "invoice_no": None,
            "bold": 1,
        })

        # --- STOCK RETURNABLE row ---
        stock_returnable = returnable_in - returnable_out
        result.append({
            "sr_no": None,
            "date": None,
            "gate_pass_no": None,
            "party_name": None,
            "vehicle_no": "STOCK RETURNABLE",
            "material_description": None,
            "in_qty": stock_returnable,
            "in_unit": in_unit,
            "out_qty": None,
            "out_unit": None,
            "returnable_status": None,
            "in_out_time": None,
            "department": None,
            "remarks": None,
            "invoice_no": None,
            "bold": 1,
        })

    return result