frappe.ui.form.on("Stock Entry", {

    // Set today's date automatically
    onload: function(frm) {

        if (frm.is_new()) {
            frm.set_value("entry_date", frappe.datetime.get_today());
        }

    },


    // When Entry Type changes
    entry_type: function(frm) {

        if (!frm.doc.spare_part) {
            return;
        }

        fetch_spare_part_details(frm);

    },


    // When Spare Part is selected
    spare_part: function(frm) {

        if (!frm.doc.spare_part) {

            frm.set_value("supplier", "");
            frm.set_value("rate", "");

            return;
        }

        fetch_spare_part_details(frm);

    }

});


// Fetch Supplier and Rate from Spare Part
function fetch_spare_part_details(frm) {

    frappe.db.get_value(
        "Spare Part",
        frm.doc.spare_part,
        [
            "supplier",
            "purchase_rate",
            "selling_rate"
        ]
    ).then(r => {

        if (r && r.message) {

            // Auto fetch Supplier
            frm.set_value(
                "supplier",
                r.message.supplier || ""
            );


            // Stock In → Purchase Rate
            if (frm.doc.entry_type === "Stock In") {

                frm.set_value(
                    "rate",
                    r.message.purchase_rate || 0
                );

            }


            // Stock Out → Selling Rate
            else if (frm.doc.entry_type === "Stock Out") {

                frm.set_value(
                    "rate",
                    r.message.selling_rate || 0
                );

            }


            // If Entry Type is not selected
            else {

                frm.set_value("rate", 0);

            }

        }

    });

}