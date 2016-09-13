
var make_base_url = function($location) {
  var url = $location.protocol() + "://" + $location.host();
  if ( $location.port() != 80 && $location.port()!= 443 ) url += ":" + $location.port();

  return url;
}


$( document ).ready(function() {
    $(".switchBox").bootstrapSwitch();
});

