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
			child.item AS item,
			parent.batch AS batch_count,
			parent.batch_size AS batch_size,
			SUM(child.opening) AS opening,
			SUM(child.loan) AS loan,
			SUM(child.purchase) AS purchase,
			SUM(child.closing) AS closing,
			SUM(child.consumption) AS consumption
		FROM `tabRM Consumpation Item` child
		JOIN `tabRM Consumpation` parent
			ON parent.name = child.parent
		WHERE parent.date BETWEEN %s AND %s
		GROUP BY child.item
		ORDER BY child.item
	""", (from_date, to_date), as_dict=1)

	total = {
		"item": "TOTAL",
		"opening": 0,
		"loan": 0,
		"purchase": 0,
		"closing": 0,
		"consumption": 0,
		"batch_count": "",
		"batch_size": "",
	}

	for row in data:
		total["opening"] += row.opening or 0
		total["loan"] += row.loan or 0
		total["purchase"] += row.purchase or 0
		total["closing"] += row.closing or 0
		total["consumption"] += row.consumption or 0

	data.append(total)

	return columns, data
