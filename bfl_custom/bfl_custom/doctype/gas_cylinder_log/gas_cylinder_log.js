frappe.ui.form.on('Gas Cylinder Log', {
    gross_weight: function(frm) {
        calculate_weights(frm);
    },
    tare_weight: function(frm) {
        calculate_weights(frm);
    },
    out_gross_weight: function(frm) {
        out_calculate_weights(frm);
    },
    out_tare_weight: function(frm) {
        out_calculate_weights(frm);
    }

});

function calculate_weights(frm) {
    let tare = frm.doc.tar_weight || 0;
    let gross = frm.doc.gross_weight || 0;

    let net = gross - tare;
    console.log(tare)
        console.log(gross)
                console.log(net)
    frm.set_value('net_weight', net);

    
    
}

function out_calculate_weights(frm) {
    let out_tare = frm.doc.tar_weight || 0;
    let out_gross = frm.doc.out_gross_weight || 0;

    let net = out_gross - out_tare;
    frm.set_value('out_net_weight', net);

    // For OUT entry
            let net_weight = frm.doc.net_weight || 0;
            let out_net_weight = frm.doc.out_net_weight
            let consumed = net_weight - out_net_weight;
            frm.set_value('gas_cosumed', consumed);
         console.log(net_weight)
        console.log(out_net_weight)
                console.log(consumed)
    
}