const i18next = require('i18next');
var label_lang = i18next.language;
var page_lang = i18next.language;

exports.set_language = function(req, res, language) {
    exports.set_label_language(req, res, language);
    exports.set_page_language(req, res, language);
    return;
}
exports.set_label_language = function(req, res, language) {
    label_lang = language;    
    res.locals.label_lang = language; 
    return;
}
exports.get_label_language = function() {
    return label_lang;
}
exports.set_page_language = function(req, res,language) {
    page_lang = language;
    res.locals.page_lang = language;
    return;
}
exports.get_page_language = function() {
    return page_lang;
}