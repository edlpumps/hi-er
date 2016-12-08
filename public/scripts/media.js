
$(document).ready(function() {
    console.log("Media loaded");
    var label = document.getElementById("label_svg");
    $.get(label.data, {}, function(doc){
        console.log(doc);
        var image = new Image();
        image.crossOrigin = "Anonymous";
        image.src = 'data:image/svg+xml;base64,' + window.btoa(doc);
        
        var canvas = document.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        var context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        context.onerror = function() {
            ctx.font = '50px "Vast Shadow"';
            ctx.textBaseline = 'top';
            ctx.fillText('Hello!', 20, 10);
        };
        var a = document.createElement('a');
        a.download = "image.png";
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        //a.click();
    }, "text")
    /*var svgDoc = label.contentDocument;
    console.log(svgDoc);
    console.log(label);*/

})
