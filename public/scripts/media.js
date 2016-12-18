
$(document).ready(function() {
   var media = [
            {
                svg : "#label_svg", 
                png : "#svg_rendered"
            }, 
            {
                svg : "#qr_svg", 
                png : "#svg_qr_rendered"
            }
        ];
        media.forEach(function(m) {
            var svg = $(m.svg).get(0);
            console.log(m.svg);
            svg.toDataURL("image/png", {
                callback: function(data) {
                    $(m.png).prop("src", data);
                }
            })
        });
    

    
    
})
