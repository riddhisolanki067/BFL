import frappe
from frappe.model.document import Document
from frappe.utils import getdate, add_days

class RMConsumpation(Document):

	def before_save(self):
		for row in self.items:

			# 1️⃣ Get Opening Qty (Previous Day Closing)
			previous_date = add_days(self.date, -1)

			opening_qty = frappe.db.sql("""
				SELECT closing
				FROM `tabRm Consumpation Item`
				WHERE item = %s
				AND parent IN (
					SELECT name FROM `tabRM Consumpation`
					WHERE date = %s
				)LIMIT 1
			""", (row.item, previous_date), as_dict=1)

			row.opening = opening_qty[0].closing if opening_qty else print("No PO Foundeeeeeeeeeeeee")


			# 2️⃣ Get Purchase Qty (from Purchase Receipt)
			purchase_qty = frappe.db.sql("""
				SELECT SUM(pri.qty)
				FROM `tabPurchase Invoice Item` pri
				JOIN `tabPurchase Invoice` pr
				ON pr.name = pri.parent
				WHERE pri.item_code = %s AND pr.custom_gate_entry IS NOT NULL 
				AND pr.custom_gate_entry != ''
				AND pr.posting_date = %s
			""", (row.item, self.date))

			row.purchase = purchase_qty[0][0] or 0
			calculated_consumption = (
				(row.opening or 0)
				+ (row.purchase or 0)
				- (row.closing or 0)
			)
			row.consumption = calculated_consumption if calculated_consumption > 0 else 0