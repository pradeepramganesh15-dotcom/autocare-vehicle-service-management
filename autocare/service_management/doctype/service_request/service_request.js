frappe.ui.form.on("Service Request", {
    
    setup: function(frm) {
        // Vehicle dropdown-la selected customer-oda vehicles mattum show aagum
        frm.set_query("vehicle", function() {
            return {
                filters: {
                    customer: frm.doc.customer
                }
            };
        });
    },

    customer: function(frm) {

        
        frm.set_value("vehicle", "");

        
        if (!frm.doc.customer) {
            return;
        }

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Vehicle",
                filters: {
                    customer: frm.doc.customer
                },
                fields: [
                    "name",
                    "vehicle_number",
                    "vehicle_model",
                    "brand"
                ],
                limit_page_length: 100
            },

            callback: function(r) {

                const vehicles = r.message || [];

                // No vehicle
                if (vehicles.length === 0) {

                    frappe.msgprint({
                        title: "Vehicle Not Found",
                        message: "No vehicle is registered for this customer.",
                        indicator: "red"
                    });

                    return;
                }

                // Only one vehicle
                if (vehicles.length === 1) {

                    frm.set_value("vehicle", vehicles[0].name);

                    return;
                }

                // Multiple vehicles
                frappe.msgprint({
                    title: "Multiple Vehicles Found",
                    message: "This customer has multiple vehicles. Please select the required vehicle.",
                    indicator: "orange"
                });
            }
        });
    }
});