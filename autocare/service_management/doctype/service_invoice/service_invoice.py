import frappe
from frappe.model.document import Document
from frappe.utils import flt


class ServiceInvoice(Document):

    # ==========================================================
    # VALIDATE
    # ==========================================================

    def validate(self):

        self.validate_job_card()
        self.validate_duplicate_invoice()
        self.validate_amounts()

        self.calculate_payment_status()

    # ==========================================================
    # JOB CARD VALIDATION
    # ==========================================================

    def validate_job_card(self):

        if not self.job_card:
            frappe.throw("Please select a Job Card.")

        job_card = frappe.get_doc(
            "Job Card",
            self.job_card
        )

        # Invoice only for Completed Job Card
        if job_card.job_status != "Completed":

            frappe.throw(
                f"Invoice can be created only for a Completed Job Card.<br><br>"
                f"Job Card: <b>{job_card.name}</b><br>"
                f"Current Status: <b>{job_card.job_status}</b>"
            )

        # Customer must match Job Card
        if self.customer != job_card.customer:

            frappe.throw(
                "Customer does not match the selected Job Card."
            )

    # ==========================================================
    # DUPLICATE INVOICE VALIDATION
    # ==========================================================

    def validate_duplicate_invoice(self):

        existing_invoice = frappe.db.exists(
            "Service Invoice",
            {
                "job_card": self.job_card,
                "docstatus": 1,
                "name": ["!=", self.name]
            }
        )

        if existing_invoice:

            frappe.throw(
                f"An invoice <b>{existing_invoice}</b> "
                f"already exists for Job Card "
                f"<b>{self.job_card}</b>."
            )

    # ==========================================================
    # AMOUNT VALIDATION
    # ==========================================================

    def validate_amounts(self):

        self.labour_cost = flt(self.labour_cost)
        self.parts_cost = flt(self.parts_cost)
        self.total_amount = flt(self.total_amount)
        self.paid_amount = flt(self.paid_amount)

        if self.labour_cost < 0:
            frappe.throw("Labour Cost cannot be negative.")

        if self.parts_cost < 0:
            frappe.throw("Parts Cost cannot be negative.")

        if self.total_amount < 0:
            frappe.throw("Total Amount cannot be negative.")

        if self.paid_amount < 0:
            frappe.throw("Paid Amount cannot be negative.")

        if self.paid_amount > self.total_amount:

            frappe.throw(
                "Paid Amount cannot be greater than Total Amount."
            )

        # Make sure total matches labour + parts
        expected_total = (
            self.labour_cost +
            self.parts_cost
        )

        if abs(self.total_amount - expected_total) > 0.01:

            frappe.throw(
                f"Total Amount is incorrect.<br><br>"
                f"Labour Cost: ₹{self.labour_cost}<br>"
                f"Parts Cost: ₹{self.parts_cost}<br>"
                f"Expected Total: ₹{expected_total}<br>"
                f"Current Total: ₹{self.total_amount}"
            )

    # ==========================================================
    # PAYMENT CALCULATION
    # ==========================================================

    def calculate_payment_status(self):

        self.balance_amount = (
            flt(self.total_amount) -
            flt(self.paid_amount)
        )

        if self.balance_amount < 0:
            self.balance_amount = 0

        if self.paid_amount <= 0:

            self.payment_status = "Unpaid"

        elif self.balance_amount > 0:

            self.payment_status = "Partially Paid"

        else:

            self.payment_status = "Paid"

    # ==========================================================
    # ON SUBMIT
    # ==========================================================

    def on_submit(self):

        self.validate_job_card()
        self.validate_duplicate_invoice()

        frappe.msgprint(
            f"Service Invoice <b>{self.name}</b> "
            f"submitted successfully."
        )

    # ==========================================================
    # ON CANCEL
    # ==========================================================

    def on_cancel(self):

        self.validate_cancellation()

        # Recalculate status before cancellation
        self.calculate_payment_status()

        frappe.msgprint(
            f"Service Invoice <b>{self.name}</b> "
            f"cancelled successfully."
        )

    # ==========================================================
    # INVOICE CANCELLATION VALIDATION
    # ==========================================================

    def validate_cancellation(self):

        # Check submitted payments linked to this invoice.
        # This assumes a custom Payment Entry has an
        # "service_invoice" Link field.

        payment_exists = frappe.db.exists(
            "Payment Entry",
            {
                "service_invoice": self.name,
                "docstatus": 1
            }
        )

        if payment_exists:

            frappe.throw(
                f"Invoice <b>{self.name}</b> cannot be cancelled "
                f"because a submitted Payment Entry "
                f"<b>{payment_exists}</b> exists.<br><br>"
                f"Cancel the Payment Entry first."
            )