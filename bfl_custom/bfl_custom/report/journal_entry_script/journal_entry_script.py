import frappe

def execute(filters=None):
	filters.setdefault("account", "")
	filters.setdefault("from_date", None)
	filters.setdefault("to_date", None)
	filters.setdefault("show_opening", "No")
	columns = get_columns()
	data = get_data(filters)
	return columns, data


def get_columns():
	return [
		
		{"fieldname": "print_col", "label": "", "fieldtype": "Data", "width": 60},
		{"fieldname": "voucher", "label": "Voucher", "fieldtype": "Link", "options": "Journal Entry"},
		{"fieldname": "posting_date", "label": "Posting Date", "fieldtype": "Date"},
		{"fieldname": "cash_account", "label": "Cash Account", "fieldtype": "Link", "options": "Account"},
		{"fieldname": "counter_details", "label": "Counter Details", "fieldtype": "Data"},
		{"fieldname": "remark", "label": "Remark", "fieldtype": "Data"},
		{"fieldname": "status", "label": "Status", "fieldtype": "Data"},
		{"fieldname": "payment_type", "label": "Payment Type", "fieldtype": "Data"},
		{"fieldname": "debit", "label": "Debit", "fieldtype": "Currency"},
		{"fieldname": "credit", "label": "Credit", "fieldtype": "Currency"},
		{"fieldname": "running_balance", "label": "Running Balance", "fieldtype": "Currency"},
	]


def get_data(filters):
	data = frappe.db.sql("""
	WITH opening AS (
		SELECT COALESCE(
			SUM(jea.debit_in_account_currency - jea.credit_in_account_currency),
			0
		) AS opening_balance
		FROM `tabJournal Entry Account` jea
		JOIN `tabJournal Entry` je ON je.name = jea.parent
		WHERE jea.account = %(account)s
		AND (%(from_date)s IS NULL OR je.posting_date < %(from_date)s)
	),

	main AS (
		SELECT
			CONCAT(
				'<button class="btn btn-xs btn-primary print-je" data-name="',
				je.name,
				'">🖨</button>'
			) AS print_col,

			je.name AS voucher,
			je.posting_date,
			cash_line.account AS cash_account,
			counter.counter_details,
			je.remark,

			CASE je.docstatus
				WHEN 0 THEN 'Draft'
				WHEN 1 THEN 'Submitted'
				WHEN 2 THEN 'Cancelled'
			END AS status,

			je.custom_payment_type AS payment_type,

			cash_line.debit_in_account_currency AS debit,
			cash_line.credit_in_account_currency AS credit,

			(
				CASE 
					WHEN %(show_opening)s = 'Yes' THEN
						(
							SELECT COALESCE(
								SUM(jea.debit_in_account_currency - jea.credit_in_account_currency), 0
							)
							FROM `tabJournal Entry Account` jea
							JOIN `tabJournal Entry` je2 ON je2.name = jea.parent
							WHERE jea.account = %(account)s
							AND (%(from_date)s IS NULL OR je2.posting_date < %(from_date)s)
						)
					ELSE 0
				END
			)
			+
			SUM(
				cash_line.debit_in_account_currency - cash_line.credit_in_account_currency
			) OVER (
				PARTITION BY cash_line.account
				ORDER BY je.posting_date, je.name, cash_line.name
				ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
			) AS running_balance

		FROM `tabJournal Entry` je
		JOIN `tabJournal Entry Account` cash_line 
			ON je.name = cash_line.parent

		LEFT JOIN (
			SELECT parent,
				GROUP_CONCAT(
					CONCAT(
						account,
						IF(party IS NOT NULL, CONCAT(' (', party, ')'), ''),
						' D:', debit_in_account_currency,
						' C:', credit_in_account_currency
					) SEPARATOR '; '
				) AS counter_details
			FROM `tabJournal Entry Account`
			GROUP BY parent
		) counter ON counter.parent = je.name

		WHERE cash_line.account = %(account)s
		AND (%(from_date)s IS NULL OR je.posting_date >= %(from_date)s)
		AND (%(to_date)s IS NULL OR je.posting_date <= %(to_date)s)
	)

	SELECT * FROM (
		SELECT
			"" AS print_col,
			"Opening" AS voucher,
			%(from_date)s AS posting_date,
			%(account)s AS cash_account,
			"" AS counter_details,
			"Opening Balance" AS remark,
			"" AS status,
			"" AS payment_type,
			0 AS debit,
			0 AS credit,
			opening_balance AS running_balance
		FROM opening

		UNION ALL

		SELECT * FROM main
	) t
	""", filters, as_dict=True)

	# ✅ Add checkbox default value
	for row in data:
		row["select_row"] = 0

	return data