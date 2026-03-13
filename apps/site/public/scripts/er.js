"use strict";

var make_base_url = function($location) {
  var url = $location.protocol() + "://" + $location.host();
  if ( $location.port() != 80 && $location.port()!= 443 ) url += ":" + $location.port();

  return url;
}

var popover_content = function() {
  var text = $(this).data("helptext");
  if ( Array.isArray(text) ) {
    var help_text = "";
    for ( var i = 0; i < text.length; i++ ) {
      help_text+="<p>" + text[i] + "</p>";
    }
    return help_text;
  }
  else {
    return text;
  }
}

$( document ).ready(function() {
    $(".switchBox").bootstrapSwitch();
    $('[data-toggle="tooltip"]').tooltip();
    $('[data-toggle="popover"]').popover({
      content:popover_content
    })
});



