import frappe

def execute(filters=None):

	columns = [
		{"label": "Gate Entry", "fieldname": "gate_entry", "fieldtype": "Link", "options": "GATE ENTRY", "width": 150},
		{"label": "Item", "fieldname": "item", "fieldtype": "Link", "options": "Item", "width": 200},
		{"label": "Purpose", "fieldname": "purpose", "fieldtype": "Data", "width": 120},
		{"label": "IN", "fieldname": "in_qty", "fieldtype": "Float", "width": 100},
		{"label": "OUT", "fieldname": "out_qty", "fieldtype": "Float", "width": 100},
		{"label": "Balance", "fieldname": "balance", "fieldtype": "Float", "width": 120},
	]

	conditions = ""
	if filters.get("item"):
		conditions += " AND gei.product = %(item)s "
	
	if filters.get("purpose"):
		conditions += " AND ge.purpose = %(purpose)s "

	entries = frappe.db.sql(f"""
		SELECT
			ge.name as gate_entry,
			ge.entry_type,
			ge.purpose,
			ge.posting_date,
			gei.product,
			IFNULL(gei.qty,0) as qty
		FROM `tabGATE ENTRY` ge
		LEFT JOIN `tabGATE ENTRY ITEM` gei
		ON ge.name = gei.parent
		WHERE 1=1 {conditions}
		ORDER BY ge.posting_date ASC
	""", filters, as_dict=1)

	data = []
	item_balance = {}

	for d in entries:
		qty = d.qty or 0
		if d.product not in item_balance:
			item_balance[d.product] = 0

		in_qty = 0
		out_qty = 0

		if d.entry_type == "IN":
			in_qty = d.qty
			item_balance[d.product] += d.qty

		elif d.entry_type == "OUT":
			out_qty = d.qty
			item_balance[d.product] -= d.qty

		balance = item_balance[d.product]

		data.append({
			"gate_entry": d.gate_entry,
			"item": d.product,
			"purpose": d.purpose,
			"in_qty": in_qty,
			"out_qty": out_qty,
			"balance": balance
		})

	return columns, data