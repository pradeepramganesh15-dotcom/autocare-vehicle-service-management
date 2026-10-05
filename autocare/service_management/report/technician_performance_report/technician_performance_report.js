frappe.query_reports["Technician Performance Report"] = {

    filters: [

        {
            fieldname: "technician",
            label: "Technician",
            fieldtype: "Link",
            options: "Technician"
        },

        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date"
        },

        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date"
        }

    ]

};