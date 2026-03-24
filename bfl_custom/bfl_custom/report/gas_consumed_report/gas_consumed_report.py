import frappe

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {"label": "Supplier", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier"},
        {"label": "Cylinder No", "fieldname": "cylinder_no", "fieldtype": "Data"},
        {"label": "IN Date", "fieldname": "in_date", "fieldtype": "Datetime"},
        {"label": "OUT Date", "fieldname": "out_date", "fieldtype": "Datetime"},
        {"label": "Tare Weight", "fieldname": "tare_weight", "fieldtype": "Float"},
        {"label": "IN Gross Weight", "fieldname": "in_gross", "fieldtype": "Float"},
        {"label": "OUT Gross Weight", "fieldname": "out_gross", "fieldtype": "Float"},
        {"label": "IN Net Gas", "fieldname": "in_net", "fieldtype": "Float"},
        {"label": "OUT Net Gas", "fieldname": "out_net", "fieldtype": "Float"},
        {"label": "Gas Consumed", "fieldname": "gas_consumed", "fieldtype": "Float"},
    ]


def get_data(filters):
    data = []

    # Fetch all IN entries
    in_entries = frappe.db.sql("""
        SELECT
            ge.name as gate_entry,
            ge.supplier,
            ge.posting_date,
            gi.cylinder_number,
            gi.tare_weight,
            gi.gross_weight,
            gi.net_weight
        FROM `tabGATE ENTRY` ge
        JOIN `tabGATE ENTRY ITEM` gi ON gi.parent = ge.name
        WHERE ge.entry_type = 'IN'
    """, as_dict=1)

    for in_entry in in_entries:
        # Find matching OUT entry
        out_entry = frappe.db.sql("""
            SELECT
                ge.posting_date,
                gi.gross_weight,
                gi.net_weight
            FROM `tabGATE ENTRY` ge
            JOIN `tabGATE ENTRY ITEM` gi ON gi.parent = ge.name
            WHERE ge.entry_type = 'OUT'
            AND ge.supplier = %s
            AND gi.cylinder_number = %s
            AND ge.posting_date > %s
            ORDER BY ge.posting_date ASC
            LIMIT 1
        """, (in_entry.supplier, in_entry.cylinder_no, in_entry.posting_date), as_dict=1)

        if out_entry:
            gas_consumed = in_entry.net_weight - out_entry[0].net_weight

            data.append({
                "supplier": in_entry.supplier,
                "cylinder_no": in_entry.cylinder_no,
                "in_date": in_entry.posting_date,
                "out_date": out_entry[0].posting_date,
                "tare_weight": in_entry.tare_weight,
                "in_gross": in_entry.gross_weight,
                "out_gross": out_entry[0].gross_weight,
                "in_net": in_entry.net_weight,
                "out_net": out_entry[0].net_weight,
                "gas_consumed": gas_consumed
            })

    return data