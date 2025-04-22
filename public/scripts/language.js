$(document).ready(function() {
    $(".lang_switch").click(function() {
        var jax = $.post("/language", {lang_set : $(this).data('lang')});
        jax.success(function() {
            location.reload(true);
        });
    });
})
