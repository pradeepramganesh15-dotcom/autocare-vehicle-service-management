frappe.ui.form.on("Service Invoice", {

    // ======================================================
    // FORM LOAD
    // ======================================================

    onload: function(frm) {

        // Set current date for new invoice
        if (frm.is_new() && !frm.doc.invoice_date) {
            frm.set_value(
                "invoice_date",
                frappe.datetime.get_today()
            );
        }

        // Calculate payment details
        calculate_payment_details(frm);
    },


    // ======================================================
    // JOB CARD CHANGE
    // ======================================================

    job_card: function(frm) {

        // If Job Card is cleared
        if (!frm.doc.job_card) {

            clear_job_card_details(frm);

            return;
        }

        // Fetch exact selected Job Card
        fetch_job_card_details(frm);
    },


    // ======================================================
    // PAID AMOUNT CHANGE
    // ======================================================

    paid_amount: function(frm) {

        calculate_payment_details(frm);
    },


    // ======================================================
    // TOTAL AMOUNT CHANGE
    // ======================================================

    total_amount: function(frm) {

        calculate_payment_details(frm);
    },


    // ======================================================
    // REFRESH
    // ======================================================

    refresh: function(frm) {

        calculate_payment_details(frm);

    },


    // ======================================================
    // BEFORE SAVE
    // ======================================================

    before_save: function(frm) {

        calculate_payment_details(frm);

    },


    // ======================================================
    // BEFORE SUBMIT
    // ======================================================

    before_submit: function(frm) {

        // Job Card is mandatory
        if (!frm.doc.job_card) {

            frappe.throw(
                "Please select a Job Card before submitting the invoice."
            );
        }

        // Total amount validation
        if (flt(frm.doc.total_amount) < 0) {

            frappe.throw(
                "Total Amount cannot be negative."
            );
        }

        // Paid amount validation
        if (flt(frm.doc.paid_amount) < 0) {

            frappe.throw(
                "Paid Amount cannot be negative."
            );
        }

        // Paid amount cannot exceed total
        if (
            flt(frm.doc.paid_amount) >
            flt(frm.doc.total_amount)
        ) {

            frappe.throw(
                "Paid Amount cannot be greater than Total Amount."
            );
        }

    }

});


// ==========================================================
// FETCH EXACT JOB CARD DETAILS
// ==========================================================

function fetch_job_card_details(frm) {

    frappe.db.get_doc(
        "Job Card",
        frm.doc.job_card
    ).then(job_card => {

        // --------------------------------------------------
        // Check Job Card status
        // --------------------------------------------------

        if (job_card.job_status !== "Completed") {

            frappe.msgprint({
                title: "Job Card Not Completed",
                message:
                    `Job Card <b>${job_card.name}</b> is currently ` +
                    `<b>${job_card.job_status}</b>.<br><br>` +
                    `Invoice can be created only for a ` +
                    `<b>Completed</b> Job Card.`,
                indicator: "orange"
            });

        }


        // --------------------------------------------------
        // Customer
        // --------------------------------------------------

        frm.set_value(
            "customer",
            job_card.customer
        );


        // --------------------------------------------------
        // Labour Cost
        // --------------------------------------------------

        frm.set_value(
            "labour_cost",
            flt(job_card.labour_cost)
        );


        // --------------------------------------------------
        // Parts Cost
        // --------------------------------------------------

        frm.set_value(
            "parts_cost",
            flt(job_card.total_parts_cost)
        );


        // --------------------------------------------------
        // Total Amount
        // --------------------------------------------------

        frm.set_value(
            "total_amount",
            flt(job_card.total_amount)
        );


        // --------------------------------------------------
        // Calculate payment details
        // --------------------------------------------------

        calculate_payment_details(frm);


        // --------------------------------------------------
        // User confirmation
        // --------------------------------------------------

        frappe.show_alert({
            message:
                `Job Card <b>${job_card.name}</b> details fetched successfully.`,
            indicator: "green"
        });

    }).catch(error => {

        console.error(error);

        frappe.msgprint({
            title: "Error",
            message:
                "Unable to fetch Job Card details.",
            indicator: "red"
        });

        clear_job_card_details(frm);

    });

}


// ==========================================================
// CLEAR JOB CARD DETAILS
// ==========================================================

function clear_job_card_details(frm) {

    frm.set_value(
        "customer",
        ""
    );

    frm.set_value(
        "labour_cost",
        0
    );

    frm.set_value(
        "parts_cost",
        0
    );

    frm.set_value(
        "total_amount",
        0
    );

    frm.set_value(
        "paid_amount",
        0
    );

    frm.set_value(
        "balance_amount",
        0
    );

    frm.set_value(
        "payment_status",
        "Unpaid"
    );

}


// ==========================================================
// PAYMENT CALCULATION
// ==========================================================

function calculate_payment_details(frm) {

    let total_amount = flt(
        frm.doc.total_amount
    );

    let paid_amount = flt(
        frm.doc.paid_amount
    );


    // ------------------------------------------------------
    // Negative amount protection
    // ------------------------------------------------------

    if (total_amount < 0) {

        total_amount = 0;

        frm.set_value(
            "total_amount",
            0
        );
    }


    if (paid_amount < 0) {

        paid_amount = 0;

        frm.set_value(
            "paid_amount",
            0
        );
    }


    // ------------------------------------------------------
    // Paid Amount cannot exceed Total Amount
    // ------------------------------------------------------

    if (
        paid_amount > total_amount &&
        total_amount >= 0
    ) {

        frappe.show_alert({
            message:
                "Paid Amount cannot be greater than Total Amount.",
            indicator: "red"
        });

        paid_amount = total_amount;

        frm.set_value(
            "paid_amount",
            paid_amount
        );
    }


    // ------------------------------------------------------
    // Balance Amount
    // ------------------------------------------------------

    let balance_amount =
        total_amount - paid_amount;


    if (balance_amount < 0) {
        balance_amount = 0;
    }


    frm.set_value(
        "balance_amount",
        balance_amount
    );


    // ------------------------------------------------------
    // Payment Status
    // ------------------------------------------------------

    let payment_status = "Unpaid";


    if (paid_amount <= 0) {

        payment_status = "Unpaid";

    }

    else if (balance_amount > 0) {

        payment_status = "Partially Paid";

    }

    else {

        payment_status = "Paid";

    }


    frm.set_value(
        "payment_status",
        payment_status
    );

}