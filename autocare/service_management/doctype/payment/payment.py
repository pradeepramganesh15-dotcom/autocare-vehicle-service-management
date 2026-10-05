import frappe

from frappe.model.document import Document
from frappe.utils import flt


class Payment(Document):

    # ==========================================================
    # VALIDATE
    # ==========================================================

    def validate(self):

        self.validate_payment_date()
        self.validate_invoice()
        self.validate_customer()
        self.validate_amount()

    # ==========================================================
    # PAYMENT DATE
    # ==========================================================

    def validate_payment_date(self):

        if not self.payment_date:
            self.payment_date = frappe.utils.getdate()

    # ==========================================================
    # INVOICE VALIDATION
    # ==========================================================

    def validate_invoice(self):

        if not self.service_invoice:
            frappe.throw(
                "Please select a Service Invoice."
            )

        invoice = frappe.get_doc(
            "Service Invoice",
            self.service_invoice
        )

        # Invoice must be submitted
        if invoice.docstatus != 1:

            frappe.throw(
                f"Service Invoice <b>{invoice.name}</b> "
                f"must be submitted before receiving payment."
            )

        # Invoice must have balance
        if flt(invoice.balance_amount) <= 0:

            frappe.throw(
                f"Service Invoice <b>{invoice.name}</b> "
                f"is already fully paid."
            )

    # ==========================================================
    # CUSTOMER VALIDATION
    # ==========================================================

    def validate_customer(self):

        invoice = frappe.get_doc(
            "Service Invoice",
            self.service_invoice
        )

        # Automatically keep customer same as invoice
        if self.customer != invoice.customer:

            self.customer = invoice.customer

    # ==========================================================
    # AMOUNT VALIDATION
    # ==========================================================

    def validate_amount(self):

        self.amount = flt(self.amount)

        if self.amount <= 0:

            frappe.throw(
                "Payment Amount must be greater than 0."
            )

        invoice = frappe.get_doc(
            "Service Invoice",
            self.service_invoice
        )

        current_balance = flt(
            invoice.balance_amount
        )

        if self.amount > current_balance:

            frappe.throw(
                f"Payment Amount cannot be greater than "
                f"the Invoice Balance.<br><br>"
                f"Invoice Balance: "
                f"<b>₹{current_balance}</b><br>"
                f"Payment Amount: "
                f"<b>₹{self.amount}</b>"
            )

    # ==========================================================
    # ON SUBMIT
    # ==========================================================

    def on_submit(self):

        self.update_service_invoice()

        self.send_payment_confirmation_email()

    # ==========================================================
    # UPDATE SERVICE INVOICE
    # ==========================================================

    def update_service_invoice(self):

        invoice = frappe.get_doc(
            "Service Invoice",
            self.service_invoice
        )

        # Existing paid amount
        old_paid_amount = flt(
            invoice.paid_amount
        )

        # New total paid amount
        new_paid_amount = (
            old_paid_amount +
            flt(self.amount)
        )

        total_amount = flt(
            invoice.total_amount
        )

        # Safety validation
        if new_paid_amount > total_amount:

            frappe.throw(
                "Total paid amount cannot be greater "
                "than invoice total."
            )

        # New balance
        new_balance = (
            total_amount -
            new_paid_amount
        )

        if new_balance < 0:
            new_balance = 0

        # Payment status
        if new_paid_amount <= 0:

            payment_status = "Unpaid"

        elif new_balance > 0:

            payment_status = "Partially Paid"

        else:

            payment_status = "Paid"

        # Update invoice
        frappe.db.set_value(
            "Service Invoice",
            invoice.name,
            {
                "paid_amount": new_paid_amount,
                "balance_amount": new_balance,
                "payment_status": payment_status
            }
        )

        frappe.msgprint(
            f"Payment of <b>₹{self.amount}</b> "
            f"received successfully.<br><br>"
            f"Invoice: <b>{invoice.name}</b><br>"
            f"Paid Amount: <b>₹{new_paid_amount}</b><br>"
            f"Balance: <b>₹{new_balance}</b><br>"
            f"Status: <b>{payment_status}</b>"
        )

    # ==========================================================
    # PAYMENT CONFIRMATION EMAIL
    # ==========================================================

    def send_payment_confirmation_email(self):

        invoice = frappe.get_doc(
            "Service Invoice",
            self.service_invoice
        )

        customer_email = frappe.db.get_value(
            "Customer",
            self.customer,
            "email"
        )

        if not customer_email:
            frappe.msgprint(
                f"No email address found for Customer "
                f"<b>{self.customer}</b>."
            )
            return

        subject = (
            f"Auto Care - Payment Received "
            f"for {invoice.name}"
        )

        message = f"""
        <p>Dear {self.customer},</p>

        <p>
            We have received your payment for the
            vehicle service.
        </p>

        <h3>Payment Details</h3>

        <table border="1" cellpadding="8" cellspacing="0">
            <tr>
                <td><b>Invoice No</b></td>
                <td>{invoice.name}</td>
            </tr>

            <tr>
                <td><b>Payment No</b></td>
                <td>{self.name}</td>
            </tr>

            <tr>
                <td><b>Payment Date</b></td>
                <td>{self.payment_date}</td>
            </tr>

            <tr>
                <td><b>Payment Mode</b></td>
                <td>{self.payment_mode}</td>
            </tr>

            <tr>
                <td><b>Payment Received</b></td>
                <td>₹{flt(self.amount):.2f}</td>
            </tr>

            <tr>
                <td><b>Total Invoice Amount</b></td>
                <td>₹{flt(invoice.total_amount):.2f}</td>
            </tr>

            <tr>
                <td><b>Total Paid</b></td>
                <td>₹{flt(invoice.paid_amount):.2f}</td>
            </tr>

            <tr>
                <td><b>Balance Amount</b></td>
                <td>₹{flt(invoice.balance_amount):.2f}</td>
            </tr>

            <tr>
                <td><b>Payment Status</b></td>
                <td>{invoice.payment_status}</td>
            </tr>
        </table>

        <p>
            Thank you for choosing Auto Care.
        </p>

        <p>
            Regards,<br>
            <b>Auto Care Service Center</b>
        </p>
        """

        frappe.sendmail(
            recipients=[customer_email],
            subject=subject,
            message=message
        )

    # ==========================================================
    # ON CANCEL
    # ==========================================================

    def on_cancel(self):

        self.reverse_payment_from_invoice()

    # ==========================================================
    # REVERSE PAYMENT
    # ==========================================================

    def reverse_payment_from_invoice(self):

        invoice = frappe.get_doc(
            "Service Invoice",
            self.service_invoice
        )

        old_paid_amount = flt(
            invoice.paid_amount
        )

        payment_amount = flt(
            self.amount
        )

        new_paid_amount = (
            old_paid_amount -
            payment_amount
        )

        if new_paid_amount < 0:
            new_paid_amount = 0

        total_amount = flt(
            invoice.total_amount
        )

        new_balance = (
            total_amount -
            new_paid_amount
        )

        if new_balance < 0:
            new_balance = 0

        # Payment status after cancellation
        if new_paid_amount <= 0:

            payment_status = "Unpaid"

        elif new_balance > 0:

            payment_status = "Partially Paid"

        else:

            payment_status = "Paid"

        frappe.db.set_value(
            "Service Invoice",
            invoice.name,
            {
                "paid_amount": new_paid_amount,
                "balance_amount": new_balance,
                "payment_status": payment_status
            }
        )

        frappe.msgprint(
            f"Payment <b>{self.name}</b> cancelled.<br><br>"
            f"Invoice: <b>{invoice.name}</b><br>"
            f"Paid Amount: <b>₹{new_paid_amount}</b><br>"
            f"Balance: <b>₹{new_balance}</b><br>"
            f"Status: <b>{payment_status}</b>"
        )