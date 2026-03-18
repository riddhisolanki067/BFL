import frappe
from frappe.utils import flt

def execute(filters=None):

    filters = filters or {}

    columns = [
        {"label": "Name", "fieldname": "name", "fieldtype": "Link", "options": "Packing Production", "width": 110},

        {"label": "Date", "fieldname": "date", "fieldtype": "Date", "width": 110},
        {"label": "Item", "fieldname": "item", "fieldtype": "Link", "options": "Item", "width": 180},
        {"label": "Machine", "fieldname": "machine", "fieldtype": "Data", "width": 120},
        {"label": "Contractor", "fieldname": "contractor", "fieldtype": "Data", "width": 140},
        {"label": "Company Worker", "fieldname": "custom_company_worker", "fieldtype": "Data", "width": 110},
        {"label": "Contractor Worker", "fieldname": "custom_contractor_worker", "fieldtype": "Data", "width": 110},
        {"label": "Box", "fieldname": "box", "fieldtype": "Float", "width": 90},
        {"label": "Daily Total", "fieldname": "daily_total", "fieldtype": "Float", "width": 120},
        {"label": "Running Balance", "fieldname": "running_balance", "fieldtype": "Float", "width": 140},
        {"label": "Sales Qty", "fieldname": "sales_qty", "fieldtype": "Float", "width": 110},
        {"label": "Closing", "fieldname": "closing", "fieldtype": "Float", "width": 110},
    ]

    # ---------------- FILTER CONDITION ----------------
    condition = ""
    if filters.get("from_date") and filters.get("to_date"):
        condition = "WHERE pp.date BETWEEN %(from_date)s AND %(to_date)s"

    # ---------------- MAIN DATA ----------------
    data = frappe.db.sql(f"""
        SELECT
            pp.name,
            pp.date,
            ppi.item,
            ppi.machine,
            ppi.contractor,
            ppi.custom_company_worker,
            ppi.custom_contractor_worker,
            ppi.box
           
        FROM
            `tabPacking Production Item` ppi
        JOIN
            `tabPacking Production` pp
        ON
            ppi.parent = pp.name
        {condition}
        ORDER BY
            ppi.item, pp.date
    """, filters, as_dict=True)

    # ---------------- DAILY TOTAL ----------------
    daily_totals = {}
    for row in data:
        key = (row.item, row.date)
        daily_totals[key] = daily_totals.get(key, 0) + flt(row.box)

    # ---------------- SALES DATA ----------------
    sales_condition = ""
    if filters.get("from_date") and filters.get("to_date"):
        sales_condition = "WHERE si.posting_date BETWEEN %(from_date)s AND %(to_date)s"

    sales_data = frappe.db.sql(f"""
        SELECT
            si.posting_date as date,
            sii.item_code as item,
            SUM(sii.qty) as qty
        FROM
            `tabSales Invoice Item` sii
        JOIN
            `tabSales Invoice` si
        ON
            sii.parent = si.name
        {sales_condition}
        GROUP BY
            si.posting_date, sii.item_code
    """, filters, as_dict=True)

    # ---------------- SALES MAP ----------------
    sales_map = {}
    for s in sales_data:
        sales_map[(s.item, s.date)] = flt(s.qty)

    # ---------------- RUNNING + CLOSING ----------------
    running_balance = {}
    last_closing = {}
    processed_dates = {}

    for row in data:

        item = row.item
        date = row.date
        key = (item, date)

        row["daily_total"] = daily_totals[key]
        row["sales_qty"] = sales_map.get(key, 0)

        if item not in running_balance:
            running_balance[item] = 0
            last_closing[item] = 0
            processed_dates[item] = set()

        if date not in processed_dates[item]:

            running = last_closing[item] + daily_totals[key]
            closing = running - row["sales_qty"]

            running_balance[item] = running
            last_closing[item] = closing

            processed_dates[item].add(date)

        row["running_balance"] = running_balance[item]
        row["closing"] = last_closing[item]

    return columns, data