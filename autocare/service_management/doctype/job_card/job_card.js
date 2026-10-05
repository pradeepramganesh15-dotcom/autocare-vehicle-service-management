frappe.ui.form.on("Job Card", {

    // --------------------------------------------------
    // FORM LOAD
    // --------------------------------------------------
    onload: function(frm) {

        if (frm.doc.service_request) {
            fetch_service_request_data(frm);
        }

        calculate_job_card_totals(frm);
    },


    // --------------------------------------------------
    // SERVICE REQUEST CHANGE
    // --------------------------------------------------
    service_request: function(frm) {

        if (!frm.doc.service_request) {

            frm.set_value("customer", "");
            frm.set_value("vehicle", "");
            frm.set_value("technician", "");
            frm.set_value("start_date", "");

            return;
        }

        fetch_service_request_data(frm);
    },


    // --------------------------------------------------
    // START DATE CHANGE
    // --------------------------------------------------
    start_date: function(frm) {

        validate_expected_delivery_date(frm);
    },


    // --------------------------------------------------
    // EXPECTED DELIVERY DATE CHANGE
    // --------------------------------------------------
    expected_delivery_date: function(frm) {

        validate_expected_delivery_date(frm);
    },


    // --------------------------------------------------
    // LABOUR COST CHANGE
    // --------------------------------------------------
    labour_cost: function(frm) {

        calculate_job_card_totals(frm);
    },


    // --------------------------------------------------
    // FORM REFRESH
    // --------------------------------------------------
    refresh: function(frm) {

        calculate_job_card_totals(frm);

        validate_expected_delivery_date(frm);
    }

});


// ======================================================
// FETCH SERVICE REQUEST DATA
// ======================================================

function fetch_service_request_data(frm) {

    frappe.db.get_value(
        "Service Request",
        frm.doc.service_request,
        [
            "customer",
            "vehicle",
            "technician",
            "service_date"
        ]
    ).then(r => {

        if (r && r.message) {

            // Customer
            frm.set_value(
                "customer",
                r.message.customer || ""
            );

            // Vehicle
            frm.set_value(
                "vehicle",
                r.message.vehicle || ""
            );

            // Technician
            frm.set_value(
                "technician",
                r.message.technician || ""
            );

            // Service Date -> Start Date
            frm.set_value(
                "start_date",
                r.message.service_date || ""
            );

        }

    });

}


// ======================================================
// EXPECTED DELIVERY DATE VALIDATION
// ======================================================

function validate_expected_delivery_date(frm) {

    if (
        !frm.doc.start_date ||
        !frm.doc.expected_delivery_date
    ) {
        return;
    }

    let difference = frappe.datetime.get_diff(
        frm.doc.expected_delivery_date,
        frm.doc.start_date
    );

    if (difference < 0) {

        frappe.show_alert({
            message: "Expected Delivery Date cannot be before Start Date.",
            indicator: "orange"
        });

    }

}


// ======================================================
// JOB CARD PART CHILD TABLE
// ======================================================

frappe.ui.form.on("Job Card Part", {

    // --------------------------------------------------
    // SPARE PART SELECTED
    // --------------------------------------------------
    spare_part: function(frm, cdt, cdn) {

        fetch_spare_part_rate(frm, cdt, cdn);

    },


    // --------------------------------------------------
    // QUANTITY CHANGED
    // --------------------------------------------------
    quantity: function(frm, cdt, cdn) {

        calculate_part_amount(frm, cdt, cdn);

    },


    // --------------------------------------------------
    // RATE CHANGED
    // --------------------------------------------------
    rate: function(frm, cdt, cdn) {

        calculate_part_amount(frm, cdt, cdn);

    },


    // --------------------------------------------------
    // AMOUNT CHANGED
    // --------------------------------------------------
    amount: function(frm) {

        calculate_job_card_totals(frm);

    },


    // --------------------------------------------------
    // CHILD ROW REMOVED
    // --------------------------------------------------
    parts_used_remove: function(frm) {

        calculate_job_card_totals(frm);

    }

});


// ======================================================
// FETCH SELLING RATE FROM SPARE PART
// ======================================================

function fetch_spare_part_rate(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    // If Spare Part is cleared
    if (!row.spare_part) {

        frappe.model.set_value(
            cdt,
            cdn,
            "rate",
            0
        );

        frappe.model.set_value(
            cdt,
            cdn,
            "amount",
            0
        );

        calculate_job_card_totals(frm);

        return;
    }


    // Fetch Selling Rate from Spare Part
    frappe.db.get_value(
        "Spare Part",
        row.spare_part,
        [
            "selling_rate",
            "current_stock"
        ]
    ).then(r => {

        if (r && r.message) {

            let selling_rate = flt(
                r.message.selling_rate
            );


            // Set Selling Rate
            frappe.model.set_value(
                cdt,
                cdn,
                "rate",
                selling_rate
            );


            // If quantity already entered,
            // calculate amount
            calculate_part_amount(frm, cdt, cdn);

        }

    });

}


// ======================================================
// CALCULATE CHILD TABLE AMOUNT
// ======================================================

function calculate_part_amount(frm, cdt, cdn) {

    let row = locals[cdt][cdn];

    let quantity = flt(row.quantity);
    let rate = flt(row.rate);

    let amount = quantity * rate;


    // Set Amount
    frappe.model.set_value(
        cdt,
        cdn,
        "amount",
        amount
    );


    // Recalculate Job Card totals
    calculate_job_card_totals(frm);

}


// ======================================================
// CALCULATE TOTAL PARTS COST + TOTAL AMOUNT
// ======================================================

function calculate_job_card_totals(frm) {

    let total_parts_cost = 0;


    // --------------------------------------------------
    // CALCULATE ALL CHILD TABLE AMOUNTS
    // --------------------------------------------------

    if (frm.doc.parts_used) {

        frm.doc.parts_used.forEach(function(row) {

            let quantity = flt(row.quantity);
            let rate = flt(row.rate);

            let amount = quantity * rate;


            // Update Amount
            if (flt(row.amount) !== amount) {

                frappe.model.set_value(
                    row.doctype,
                    row.name,
                    "amount",
                    amount
                );

            }


            // Add to Total Parts Cost
            total_parts_cost += amount;

        });

    }


    // --------------------------------------------------
    // TOTAL PARTS COST
    // --------------------------------------------------

    frm.set_value(
        "total_parts_cost",
        total_parts_cost
    );


    // --------------------------------------------------
    // LABOUR COST
    // --------------------------------------------------

    let labour_cost = flt(
        frm.doc.labour_cost
    );


    // --------------------------------------------------
    // TOTAL AMOUNT
    // --------------------------------------------------

    let total_amount =
        labour_cost + total_parts_cost;


    frm.set_value(
        "total_amount",
        total_amount
    );

}