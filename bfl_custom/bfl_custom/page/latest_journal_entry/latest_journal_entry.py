import frappe
from frappe import _

@frappe.whitelist()
def get_latest_journal_entries(account, from_date):

    # ⭐ MAIN QUERY WITH OPENING + RUNNING
    data = frappe.db.sql("""

        WITH opening AS (
            SELECT 
                COALESCE(
                    SUM(jea.debit_in_account_currency 
                      - jea.credit_in_account_currency), 0
                ) AS opening_balance
            FROM `tabJournal Entry Account` jea
            JOIN `tabJournal Entry` je 
                ON je.name = jea.parent
            WHERE
                jea.account = %(account)s
                AND je.posting_date < %(from_date)s
        ),

        main AS (
            SELECT
                je.name AS voucher,
                je.posting_date,
                je.creation,

                cash_line.account AS cash_account,

                GROUP_CONCAT(
                    CONCAT(
                        other_line.account,
                        IF(other_line.party IS NOT NULL,
                            CONCAT(' (', other_line.party, ')'), ''
                        ),
                        ' D:', other_line.debit_in_account_currency,
                        ' C:', other_line.credit_in_account_currency
                    ) SEPARATOR '; '
                ) AS counter_details,

                je.remark,

                CASE je.docstatus
                    WHEN 0 THEN 'Draft'
                    WHEN 1 THEN 'Submitted'
                    WHEN 2 THEN 'Cancelled'
                END AS status,

                je.custom_payment_type,

                cash_line.debit_in_account_currency AS debit,
                cash_line.credit_in_account_currency AS credit,

                SUM(
                    cash_line.debit_in_account_currency
                  - cash_line.credit_in_account_currency
                ) OVER (
                    ORDER BY je.posting_date, je.name
                ) AS running_balance

            FROM `tabJournal Entry` je

            JOIN `tabJournal Entry Account` cash_line
                ON je.name = cash_line.parent

            LEFT JOIN `tabJournal Entry Account` other_line
                ON je.name = other_line.parent
                AND other_line.name != cash_line.name

            WHERE
                cash_line.account = %(account)s
                AND je.posting_date >= %(from_date)s

            GROUP BY
                je.name,
                cash_line.name

            ORDER BY je.creation DESC
            LIMIT 10
        )

        SELECT
            'Opening' AS voucher,
            %(from_date)s AS posting_date,
            '' AS creation,
            %(account)s AS cash_account,
            '' AS counter_details,
            'Opening Balance' AS remark,
            '' AS status,
            '' AS custom_payment_type,
            0 AS debit,
            0 AS credit,
            opening_balance AS running_balance
        FROM opening

        UNION ALL

        SELECT * FROM main

        ORDER BY posting_date, voucher

    """, {
        "account": account,
        "from_date": from_date
    }, as_dict=True)

    # ⭐ TOTAL CALCULATION
    total_debit = sum(d.debit for d in data)
    total_credit = sum(d.credit for d in data)

    return {
        "rows": data,
        "total_debit": total_debit,
        "total_credit": total_credit
    }