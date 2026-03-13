
$(document).ready(function() {
    $(".us_unit_switch").click(function() {
        var jax = $.post("/units", {unit_set : "US"});
        jax.success(function() {
            location.reload(true);
        });
        
    });

    
    $(".metric_unit_switch").click(function() {
        var jax = $.post("/units", {unit_set : "METRIC"});
        jax.success(function() {
            location.reload(true);
        });

    });
})
