import frappe


def execute(filters=None):

    columns = get_columns()
    data = get_data(filters)

    return columns, data


def get_columns():

    return [
        {
            "label": "Technician",
            "fieldname": "technician",
            "fieldtype": "Link",
            "options": "Technician",
            "width": 180
        },
        {
            "label": "Total Jobs",
            "fieldname": "total_jobs",
            "fieldtype": "Int",
            "width": 120
        },
        {
            "label": "Total Labour Cost",
            "fieldname": "labour_cost",
            "fieldtype": "Currency",
            "width": 160
        },
        {
            "label": "Total Parts Cost",
            "fieldname": "parts_cost",
            "fieldtype": "Currency",
            "width": 160
        },
        {
            "label": "Total Revenue",
            "fieldname": "total_revenue",
            "fieldtype": "Currency",
            "width": 160
        }
    ]


def get_data(filters):

    conditions = """
        jc.docstatus = 1
    """

    values = {}

    if filters:

        if filters.get("technician"):
            conditions += """
                AND jc.technician = %(technician)s
            """

            values["technician"] = filters.get("technician")

        if filters.get("from_date"):
            conditions += """
                AND DATE(jc.creation) >= %(from_date)s
            """

            values["from_date"] = filters.get("from_date")

        if filters.get("to_date"):
            conditions += """
                AND DATE(jc.creation) <= %(to_date)s
            """

            values["to_date"] = filters.get("to_date")


    data = frappe.db.sql(
        f"""
        SELECT
            jc.technician AS technician,
            COUNT(jc.name) AS total_jobs,
            SUM(IFNULL(jc.labour_cost, 0)) AS labour_cost,
            SUM(IFNULL(jc.total_parts_cost, 0)) AS parts_cost,
            SUM(IFNULL(jc.total_amount, 0)) AS total_revenue

        FROM `tabJob Card` jc

        WHERE {conditions}

        GROUP BY jc.technician

        ORDER BY total_revenue DESC
        """,
        values,
        as_dict=True
    )

    return data