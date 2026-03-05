import frappe
from frappe.utils import flt

def execute(filters=None):

    columns = [
        {"label": "Date", "fieldname": "date", "fieldtype": "Date", "width": 110},
        {"label": "Item", "fieldname": "item", "fieldtype": "Link", "options": "Item", "width": 180},
        {"label": "Machine", "fieldname": "machine", "fieldtype": "Data", "width": 120},
        {"label": "Contractor", "fieldname": "contractor", "fieldtype": "Data", "width": 140},
        {"label": "Box", "fieldname": "box", "fieldtype": "Float", "width": 90},
        {"label": "Daily Total", "fieldname": "daily_total", "fieldtype": "Float", "width": 120},
        {"label": "Running Balance", "fieldname": "running_balance", "fieldtype": "Float", "width": 140},
        {"label": "Sales Qty", "fieldname": "sales_qty", "fieldtype": "Float", "width": 110},
        {"label": "Closing", "fieldname": "closing", "fieldtype": "Float", "width": 110, "hidden":1},
    ]

    data = frappe.db.sql("""
        SELECT
            pp.date,
            ppi.item,
            ppi.machine,
            ppi.contractor,
            ppi.box
        FROM
            `tabPacking Production Item` ppi
        JOIN
            `tabPacking Production` pp
        ON
            ppi.parent = pp.name
        ORDER BY
            ppi.item, pp.date
    """, as_dict=True)

    # Daily production totals
    daily_totals = {}
    for row in data:
        key = (row.item, row.date)
        daily_totals[key] = daily_totals.get(key, 0) + flt(row.box)

    # Sales qty from Sales Invoice
    sales_data = frappe.db.sql("""
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
	
        GROUP BY
            si.posting_date, sii.item_code
    """, as_dict=True)

    sales_map = {}
    for s in sales_data:
        sales_map[(s.item, s.date)] = flt(s.qty)

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