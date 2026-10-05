frappe.ui.form.on("Payment", {

    // ======================================================
    // ONLOAD
    // ======================================================

    onload: function(frm) {

        if (
            frm.is_new() &&
            !frm.doc.payment_date
        ) {
            frm.set_value(
                "payment_date",
                frappe.datetime.get_today()
            );
        }

        if (frm.doc.service_invoice) {
            fetch_invoice_details(frm);
        }
    },


    // ======================================================
    // SERVICE INVOICE CHANGE
    // ======================================================

    service_invoice: function(frm) {

        if (!frm.doc.service_invoice) {

            frm.set_value("customer", "");
            frm.set_value("amount", 0);

            return;
        }

        fetch_invoice_details(frm);
    },


    // ======================================================
    // AMOUNT CHANGE
    // ======================================================

    amount: function(frm) {

        validate_payment_amount(frm);

        // If UPI is already selected,
        // refresh QR with latest amount
        if (frm.doc.payment_mode === "UPI") {
            show_upi_popup(frm);
        }
    },


    // ======================================================
    // PAYMENT MODE CHANGE
    // ======================================================

    payment_mode: function(frm) {

        if (frm.doc.payment_mode === "UPI") {

            if (!flt(frm.doc.amount)) {

                frappe.show_alert({
                    message: "Please select Service Invoice / enter payment amount first.",
                    indicator: "orange"
                });

                return;
            }

            // Show UPI popup
            show_upi_popup(frm);
        }
    },


    // ======================================================
    // CUSTOMER CHANGE
    // ======================================================

    customer: function(frm) {

        if (!frm.doc.customer) {
            return;
        }

        if (frm.doc.service_invoice) {

            frappe.db.get_value(
                "Service Invoice",
                frm.doc.service_invoice,
                "customer"
            ).then(r => {

                if (
                    r.message &&
                    r.message.customer !== frm.doc.customer
                ) {

                    frappe.show_alert({
                        message:
                            "Customer is automatically linked " +
                            "to the selected Service Invoice.",
                        indicator: "orange"
                    });

                    frm.set_value(
                        "customer",
                        r.message.customer
                    );
                }
            });
        }
    }

});


// ==========================================================
// FETCH SERVICE INVOICE DETAILS
// ==========================================================

function fetch_invoice_details(frm) {

    frappe.db.get_doc(
        "Service Invoice",
        frm.doc.service_invoice
    ).then(invoice => {

        if (!invoice) {
            return;
        }

        // --------------------------------------------------
        // Invoice must be submitted
        // --------------------------------------------------

        if (invoice.docstatus !== 1) {

            frappe.msgprint({
                title: "Invalid Invoice",
                message:
                    "Only submitted Service Invoices " +
                    "can receive payments.",
                indicator: "red"
            });

            frm.set_value(
                "service_invoice",
                ""
            );

            return;
        }


        // --------------------------------------------------
        // Check balance
        // --------------------------------------------------

        let balance = flt(
            invoice.balance_amount
        );

        if (balance <= 0) {

            frappe.msgprint({
                title: "Invoice Fully Paid",
                message:
                    "This Service Invoice is already fully paid.",
                indicator: "green"
            });

            frm.set_value(
                "amount",
                0
            );

            return;
        }


        // --------------------------------------------------
        // Customer
        // --------------------------------------------------

        frm.set_value(
            "customer",
            invoice.customer
        );


        // --------------------------------------------------
        // Show invoice balance
        // --------------------------------------------------

        frappe.show_alert({
            message:
                "Invoice Balance: ₹" +
                balance.toFixed(2),
            indicator: "blue"
        });


        // --------------------------------------------------
        // Default payment amount
        // --------------------------------------------------

        if (
            frm.is_new() &&
            !flt(frm.doc.amount)
        ) {

            frm.set_value(
                "amount",
                balance
            );
        }

    });
}


// ==========================================================
// VALIDATE PAYMENT AMOUNT
// ==========================================================

function validate_payment_amount(frm) {

    if (!frm.doc.service_invoice) {
        return;
    }

    let amount = flt(
        frm.doc.amount
    );

    if (amount < 0) {

        frm.set_value(
            "amount",
            0
        );

        frappe.show_alert({
            message:
                "Payment amount cannot be negative.",
            indicator: "red"
        });

        return;
    }


    frappe.db.get_value(
        "Service Invoice",
        frm.doc.service_invoice,
        [
            "total_amount",
            "paid_amount",
            "balance_amount"
        ]
    ).then(r => {

        if (!r.message) {
            return;
        }

        let balance = flt(
            r.message.balance_amount
        );


        if (amount > balance) {

            frappe.show_alert({
                message:
                    "Payment cannot be greater than " +
                    "Invoice Balance ₹" +
                    balance.toFixed(2),
                indicator: "red"
            });

            frm.set_value(
                "amount",
                balance
            );
        }

    });
}


// ==========================================================
// UPI PAYMENT POPUP
// ==========================================================

function show_upi_popup(frm) {

    let amount = flt(frm.doc.amount);

    if (amount <= 0) {
        return;
    }


    // ------------------------------------------------------
    // YOUR BUSINESS UPI ID
    // ------------------------------------------------------

    let upi_id = "8072427580@okbi";


    // ------------------------------------------------------
    // UPI PAYMENT DATA
    // ------------------------------------------------------

    let upi_string =
        "upi://pay?" +
        "pa=" + encodeURIComponent(upi_id) +
        "&pn=" + encodeURIComponent("AutoCare") +
        "&am=" + encodeURIComponent(amount.toFixed(2)) +
        "&cu=INR";


    // ------------------------------------------------------
    // QR CODE URL
    // ------------------------------------------------------

    let qr_url =
        "https://api.qrserver.com/v1/create-qr-code/" +
        "?size=250x250" +
        "&data=" + encodeURIComponent(upi_string);


    // ------------------------------------------------------
    // DIALOG
    // ------------------------------------------------------

    let dialog = new frappe.ui.Dialog({

        title: "UPI Payment",

        size: "small",

        fields: [

            {
                fieldtype: "HTML",
                fieldname: "upi_payment_html"
            }

        ]

    });


    // ------------------------------------------------------
    // POPUP HTML
    // ------------------------------------------------------

    let html = `

        <div style="
            text-align:center;
            padding:10px 5px 5px 5px;
        ">

            <div style="
                font-size:20px;
                font-weight:600;
                margin-bottom:8px;
            ">
                Pay using UPI
            </div>


            <div style="
                color:#666;
                font-size:13px;
                margin-bottom:15px;
            ">
                Scan using Google Pay / PhonePe /
                Paytm / BHIM
            </div>


            <div style="
                display:flex;
                justify-content:center;
                align-items:center;
                margin-bottom:15px;
            ">

                <img
                    src="${qr_url}"
                    style="
                        width:220px;
                        height:220px;
                        border:1px solid #ddd;
                        border-radius:8px;
                        padding:5px;
                        background:white;
                    "
                >

            </div>


            <div style="
                font-size:18px;
                font-weight:600;
                margin-bottom:6px;
            ">
                Amount: ₹${amount.toFixed(2)}
            </div>


            <div style="
                font-size:14px;
                color:#555;
                margin-bottom:10px;
            ">
                UPI ID: ${upi_id}
            </div>


            <div style="
                font-size:12px;
                color:#888;
            ">
                This popup will close automatically in
                <span id="upi-countdown"
                      style="font-weight:bold;">
                    10
                </span>
                seconds.
            </div>

        </div>

    `;


    dialog.fields_dict.upi_payment_html.$wrapper.html(
        html
    );


    // ------------------------------------------------------
    // SHOW POPUP
    // ------------------------------------------------------

    dialog.show();


    // ------------------------------------------------------
    // 10 SECOND COUNTDOWN
    // ------------------------------------------------------

    let remaining_seconds = 10;

    let countdown = setInterval(function() {

        remaining_seconds--;

        let element =
            dialog.fields_dict
                .upi_payment_html
                .$wrapper
                .find("#upi-countdown");


        if (element.length) {
            element.text(
                remaining_seconds
            );
        }


        // --------------------------------------------------
        // CLOSE AFTER 10 SECONDS
        // --------------------------------------------------

        if (remaining_seconds <= 0) {

            clearInterval(countdown);

            dialog.hide();
        }

    }, 1000);


    // ------------------------------------------------------
    // CLEAR TIMER WHEN DIALOG CLOSED MANUALLY
    // ------------------------------------------------------

    dialog.onhide = function() {

        clearInterval(countdown);

    };

}