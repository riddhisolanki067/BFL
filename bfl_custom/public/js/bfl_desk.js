// $(document).ready(function () {

//     console.log("called");

//     var newButton = $('<button id="session-company-btn"/>');

//     // 1Get session default company
//     let currentCompany = frappe.defaults.get_default("company");

//     // Default text
//     if (currentCompany) {
//         newButton.text(currentCompany);
//     } else {
//         newButton.text("Select Company");
//     }

//     // Style
//     newButton.css({
//         borderRadius: '5px',
//         color: 'white',
//         backgroundColor: '#0074d9',
//         border: '0px',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         cursor: 'pointer',
//         padding: '6px 12px',
//     });

//     //  Only open popup on button click
//     newButton.on("click", function () {
//         frappe.ui.toolbar.setup_session_defaults();
//     });

//     // Add button
//     $('.input-group.search-bar.text-muted').before(newButton);

//     // Update text AFTER popup save
//     frappe.realtime.on("session_default_changed", function () {

//         let updatedCompany = frappe.defaults.get_default("company");

//         if (updatedCompany) {
//             newButton.text(updatedCompany);
//         } else {
//             newButton.text("Select Company");
//         }
//     });

// });
