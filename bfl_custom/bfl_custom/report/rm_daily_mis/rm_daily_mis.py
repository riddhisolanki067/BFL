import frappe
from collections import defaultdict

def execute(filters=None):

    filters = filters or {}
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    columns = []
    data = []

    # 1️⃣ Get Items Used In Selected Date Range
    items = frappe.db.sql("""
        SELECT DISTINCT child.item
        FROM `tabRm Consumpation Item` child
        JOIN `tabRM Consumpation` parent
        ON parent.name = child.parent
        WHERE parent.date BETWEEN %s AND %s
        ORDER BY child.item
    """, (from_date, to_date), as_dict=1)

    item_list = [d.item for d in items]

    # 2️⃣ Create Columns
    columns.append({
        "label": "Date",
        "fieldname": "date",
        "fieldtype": "Date",
        "width": 100
    })

    for item in item_list:
        safe_item = frappe.scrub(item)

        columns.extend([
            {"label": f"{item} Opening", "fieldname": f"{safe_item}_opening", "fieldtype": "Float", "width": 120},
            {"label": f"{item} Purchase", "fieldname": f"{safe_item}_purchase", "fieldtype": "Float", "width": 120},
            {"label": f"{item} Closing", "fieldname": f"{safe_item}_closing", "fieldtype": "Float", "width": 120},
            {"label": f"{item} Consumption", "fieldname": f"{safe_item}_consumption", "fieldtype": "Float", "width": 120},
        ])

    # 3️⃣ Fetch Data
    records = frappe.db.sql("""
        SELECT parent.date,
               child.item,
               child.opening,
               child.purchase,
               child.closing,
               child.consumption
        FROM `tabRm Consumpation Item` child
        JOIN `tabRM Consumpation` parent
        ON parent.name = child.parent
        WHERE parent.date BETWEEN %s AND %s
        ORDER BY parent.date
    """, (from_date, to_date), as_dict=1)

    grouped = defaultdict(dict)

    for row in records:
        date = row.date
        item = frappe.scrub(row.item)

        grouped[date]["date"] = date
        grouped[date][f"{item}_opening"] = row.opening
        grouped[date][f"{item}_purchase"] = row.purchase
        grouped[date][f"{item}_closing"] = row.closing
        grouped[date][f"{item}_consumption"] = row.consumption

    for date in sorted(grouped):
        data.append(grouped[date])

    # 4️⃣ Add Total Row
    totals = {"date": "TOTAL"}

    for row in data:
        for key, value in row.items():
            if key != "date":
                totals[key] = totals.get(key, 0) + (value or 0)

    data.append(totals)

    return columns, data