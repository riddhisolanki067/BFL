import frappe

def execute(filters=None):

    filters = filters or {}
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    columns = [
        {"label": "Item", "fieldname": "item", "fieldtype": "Data", "width": 150},
        {"label": "Batch", "fieldname": "batch_count", "fieldtype": "Data", "width": 100},
        {"label": "Batch Size", "fieldname": "batch_size", "fieldtype": "Data", "width": 100},
        {"label": "Opening", "fieldname": "opening", "fieldtype": "Float", "width": 100},
        {"label": "Loan", "fieldname": "loan", "fieldtype": "Float", "width": 100},
        {"label": "Purchase", "fieldname": "purchase", "fieldtype": "Float", "width": 100},
        {"label": "Closing", "fieldname": "closing", "fieldtype": "Float", "width": 100},
        {"label": "Consumption", "fieldname": "consumption", "fieldtype": "Float", "width": 120},
    ]

    data = frappe.db.sql("""
        SELECT
            t.item,
            t.batch_count,
            t.batch_size,

            -- Opening (previous day)
            (
                SELECT child2.closing
                FROM `tabRm Consumpation Item` child2
                JOIN `tabRM Consumpation` parent2
                ON parent2.name = child2.parent
                WHERE child2.item = t.item
                AND parent2.date < %s
                ORDER BY parent2.date DESC
                LIMIT 1
            ) AS opening,

            SUM(t.loan) AS loan,
            SUM(t.purchase) AS purchase,

            -- Closing (last date)
            (
                SELECT child3.closing
                FROM `tabRm Consumpation Item` child3
                JOIN `tabRM Consumpation` parent3
                ON parent3.name = child3.parent
                WHERE child3.item = t.item
                AND parent3.date <= %s
                ORDER BY parent3.date DESC
                LIMIT 1
            ) AS closing,

            SUM(t.consumption) AS consumption

        FROM
        (
            SELECT
                child.item,
                parent.batch AS batch_count,
                parent.batch_size,
                child.loan,
                child.purchase,
                child.consumption
            FROM `tabRm Consumpation Item` child
            JOIN `tabRM Consumpation` parent
            ON parent.name = child.parent
            WHERE parent.date BETWEEN %s AND %s
        ) t

        GROUP BY t.item, t.batch_count, t.batch_size
        ORDER BY t.item
        """, (from_date, to_date, from_date, to_date), as_dict=1)

    total = {
        "item": "TOTAL",
        "batch_count": "",
        "batch_size": "",
        "opening": 0,
        "loan": 0,
        "purchase": 0,
        "closing": 0,
        "consumption": 0,
    }

    for row in data:
        total["opening"] += row.opening or 0
        total["loan"] += row.loan or 0
        total["purchase"] += row.purchase or 0
        total["closing"] += row.closing or 0
        total["consumption"] += row.consumption or 0

    data.append(total)

    return columns, data