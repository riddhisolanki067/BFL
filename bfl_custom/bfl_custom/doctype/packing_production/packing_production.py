# Copyright (c) 2026, r and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PackingProduction(Document):
	def before_save(doc):
		for row in doc.items:
			if not (row.item and row.machine and row.contractor and doc.date):
				row.opening_box = 0
				continue

			last_entry = frappe.db.sql("""
				SELECT child.box_balance
				FROM `tabPacking Production Item` child
				INNER JOIN `tabPacking Production` parent
					ON parent.name = child.parent
				WHERE 
					parent.date < %s
					AND child.item = %s
					AND child.machine = %s
					AND child.contractor = %s
				
				ORDER BY parent.date DESC
				LIMIT 1
			""", (doc.date, row.item, row.machine, row.contractor), as_dict=1)

			if last_entry:
				row.opening_box = last_entry[0].box_balance
			else:
				row.opening_box = 0