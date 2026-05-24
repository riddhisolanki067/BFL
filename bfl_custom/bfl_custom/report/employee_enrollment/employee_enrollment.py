import frappe


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data


def get_columns():
    return [
        {
            "label": "Employee ID",
            "fieldname": "name",
            "fieldtype": "Link",
            "options": "Employee",
            "width": 140,
        },
        {
            "label": "Employee Name",
            "fieldname": "employee_name",
            "fieldtype": "Data",
            "width": 180,
        },
     
        {
            "label": "Designation",
            "fieldname": "designation",
            "fieldtype": "Link",
            "options": "Designation",
            "width": 150,
        },
       
        {
            "label": "Date of Joining",
            "fieldname": "date_of_joining",
            "fieldtype": "Date",
            "width": 130,
        },
        {
            "label": "Status",
            "fieldname": "status",
            "fieldtype": "Data",
            "width": 100,
        },
        {
            "label": "Company",
            "fieldname": "company",
            "fieldtype": "Link",
            "options": "Company",
            "width": 150,
        },
    ]


def get_data(filters):

    # Get all employees NOT present in Face Employee Profile
    data = frappe.db.sql(
        """
        SELECT
            e.name,
            e.employee_name,
            e.designation,
            e.date_of_joining,
            e.status,
            e.company
        FROM
            `tabEmployee` e
        WHERE
            e.name NOT IN (
                SELECT DISTINCT fep.employee
                FROM `tabFace Employee Profile` fep
                WHERE fep.employee IS NOT NULL
                  AND fep.employee != ''
            )
          
	""",
        as_dict=True,
    )

    return data


