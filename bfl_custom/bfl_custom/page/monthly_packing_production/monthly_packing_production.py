import frappe

@frappe.whitelist()
def get_data(from_date, to_date):

    contractor_summary = frappe.db.sql("""
        SELECT
            ppi.contractor,
            SUM(ppi.box) as total_box
        FROM `tabPacking Production Item` ppi
        JOIN `tabPacking Production` pp
            ON pp.name = ppi.parent
        WHERE pp.date BETWEEN %(from_date)s AND %(to_date)s
        GROUP BY ppi.contractor
        ORDER BY total_box DESC
    """, {
        "from_date": from_date,
        "to_date": to_date
    }, as_dict=True)


    production_data = frappe.db.sql("""
        SELECT
            ppi.contractor,
            ppi.machine,
            COALESCE(i.custom_item_print_name,'None') as item_name,
            DAY(pp.date) as d,
            SUM(ppi.box) as box
        FROM `tabPacking Production Item` ppi

        JOIN `tabPacking Production` pp
            ON pp.name = ppi.parent

        LEFT JOIN `tabItem` i
            ON i.name = ppi.item

        WHERE pp.date BETWEEN %(from_date)s AND %(to_date)s

        GROUP BY
            ppi.contractor,
            ppi.machine,
            item_name,
            DAY(pp.date)

        ORDER BY
            ppi.machine,
            item_name
    """, {
        "from_date": from_date,
        "to_date": to_date
    }, as_dict=True)


    return {
        "contractor_summary": contractor_summary,
        "data": production_data
    }