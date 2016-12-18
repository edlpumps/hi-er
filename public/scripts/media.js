
$(document).ready(function() {
   var media = [
            {
                svg : "#label_svg", 
                png : "#svg_rendered",
                download: "label_img_download"
            }, 
            {
                svg : "#qr_svg", 
                png : "#svg_qr_rendered",
                download: "qr_img_download"
            }
        ];
        media.forEach(function(m) {
            var svg = $(m.svg).get(0);
            svg.toDataURL("image/png", {
                callback: function(data) {
                    $(m.png).prop("src", data);
                    console.log(m.download)
                    var a = document.getElementById(m.download);
                    a.href = data;
                }
            })
        });
    

    
    
})
