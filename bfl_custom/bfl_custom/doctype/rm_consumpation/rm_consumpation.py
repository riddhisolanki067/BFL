import frappe
from frappe.model.document import Document
from frappe.utils import add_days


class RMConsumpation(Document):

	def before_save(self):

		for row in self.items:

			# 1️⃣ Get Opening Qty (Previous Day Closing)
			previous_date = add_days(self.date, -1)

			opening_qty = frappe.db.sql("""
			SELECT rci.closing
			FROM `tabRm Consumpation Item` rci
			INNER JOIN `tabRM Consumpation` rc
				ON rci.parent = rc.name
			WHERE rci.item = %s
			AND rc.date < %s
			ORDER BY rc.date DESC
			LIMIT 1
			""", (row.item, self.date), as_dict=1)


			row.opening = opening_qty[0].closing if opening_qty else 0

			# 2️⃣ Purchase Qty from Purchase Invoice (existing logic)
			purchase_invoice_qty = frappe.db.sql("""
				SELECT SUM(pri.qty)
				FROM `tabPurchase Invoice Item` pri
				JOIN `tabPurchase Invoice` pr
				ON pr.name = pri.parent
				WHERE pri.item_code = %s
				AND pr.custom_gate_entry IS NOT NULL
				AND pr.custom_gate_entry != ''
				AND pr.posting_date = %s
			""", (row.item, self.date))

			purchase_invoice_qty = purchase_invoice_qty[0][0] or 0

			# 3️⃣ Gate Entry Logic
			gate_entries = frappe.db.sql("""
				SELECT gei.qty, ge.entry_type, ge.purpose
				FROM `tabGATE ENTRY ITEM` gei
				JOIN `tabGATE ENTRY` ge
				ON ge.name = gei.parent
				WHERE gei.product = %s
				AND ge.posting_date = %s
			""", (row.item, self.date), as_dict=1)

			gate_purchase = 0
			gate_loan = 0

			for g in gate_entries:
				if g.type == "OUT" and g.purpose in ["LOAN IN", "LOAN Return"]:
					gate_loan += g.qty or 0
				if g.entry_type == "IN" or g.type == "NON RETURNABLE IN":
					gate_purchase += g.qty or 0

			# 4️⃣ Final Purchase = PI Purchase + Gate Entry Purchase
			row.purchase = purchase_invoice_qty + gate_purchase

			# 5️⃣ Loan Qty
			row.loan = gate_loan

			# 6️⃣ Consumption Calculation
			calculated_consumption = (
				(row.opening or 0)
				+ (row.purchase or 0)
				+ (row.loan or 0)
				- (row.closing or 0)
			)

			row.consumption = calculated_consumption if calculated_consumption > 0 else 0