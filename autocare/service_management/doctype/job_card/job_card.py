import frappe
from frappe.model.document import Document
from frappe.utils import flt


class JobCard(Document):

    def on_submit(self):

        self.reduce_stock_from_stock_entries()

    def on_cancel(self):

        self.restore_stock_to_stock_entries()

    # ==========================================================
    # REDUCE STOCK ON JOB CARD SUBMIT
    # ==========================================================

    def reduce_stock_from_stock_entries(self):

        for part in self.parts_used:

            if not part.spare_part:
                continue

            required_qty = flt(part.quantity)

            if required_qty <= 0:
                continue

            remaining_qty = required_qty

            # --------------------------------------------------
            # Get Stock In Entries
            # Oldest first = FIFO
            # --------------------------------------------------

            stock_entries = frappe.get_all(
                "Stock Entry",
                filters={
                    "spare_part": part.spare_part,
                    "entry_type": "Stock In",
                    "quantity": [">", 0]
                },
                fields=[
                    "name",
                    "quantity"
                ],
                order_by="creation asc"
            )

            # --------------------------------------------------
            # Check available stock
            # --------------------------------------------------

            available_qty = sum(
                flt(entry.quantity)
                for entry in stock_entries
            )

            if available_qty < required_qty:

                frappe.throw(
                    f"Insufficient stock for <b>{part.spare_part}</b>."
                    f"<br><br>"
                    f"Available Stock: {available_qty}"
                    f"<br>"
                    f"Required Quantity: {required_qty}"
                )

            # --------------------------------------------------
            # Deduct from Stock Entry
            # --------------------------------------------------

            for entry in stock_entries:

                if remaining_qty <= 0:
                    break

                stock_qty = flt(entry.quantity)

                deduct_qty = min(
                    stock_qty,
                    remaining_qty
                )

                new_qty = stock_qty - deduct_qty

                frappe.db.set_value(
                    "Stock Entry",
                    entry.name,
                    "quantity",
                    new_qty,
                    update_modified=False
                )

                remaining_qty -= deduct_qty

                frappe.msgprint(
                    f"{part.spare_part}: "
                    f"{deduct_qty} deducted from "
                    f"{entry.name}"
                )

    # ==========================================================
    # RESTORE STOCK ON JOB CARD CANCEL
    # ==========================================================

    def restore_stock_to_stock_entries(self):

        for part in self.parts_used:

            if not part.spare_part:
                continue

            restore_qty = flt(part.quantity)

            if restore_qty <= 0:
                continue

            # --------------------------------------------------
            # Get Stock In Entries
            # Oldest first
            # --------------------------------------------------

            stock_entries = frappe.get_all(
                "Stock Entry",
                filters={
                    "spare_part": part.spare_part,
                    "entry_type": "Stock In"
                },
                fields=[
                    "name",
                    "quantity"
                ],
                order_by="creation asc"
            )

            if not stock_entries:
                frappe.throw(
                    f"No Stock In entry found for "
                    f"<b>{part.spare_part}</b>."
                )

            # --------------------------------------------------
            # Restore stock
            # --------------------------------------------------

            entry = stock_entries[0]

            current_qty = flt(entry.quantity)

            new_qty = current_qty + restore_qty

            frappe.db.set_value(
                "Stock Entry",
                entry.name,
                "quantity",
                new_qty,
                update_modified=False
            )

            frappe.msgprint(
                f"{part.spare_part}: "
                f"{restore_qty} restored to "
                f"{entry.name}"
            )