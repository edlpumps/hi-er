const i18next = require('i18next');
var label_lang = 'en';

exports.set_language = function(req, res, language) {
    i18next.changeLanguage(language);
    //res.locals.moment.locale(lang_set);
    req.session.lang_set = language;
    res.locals.lang_set = language;
    label_lang = language;
    return;
}
exports.set_label_language = function(language) {
    label_lang = language;
    return;
}
exports.set_page_language = function(language) {
    label_lang = language;
    return;
}
exports.get_label_language = function() {
    return label_lang;
}
exports.get_language = function(req, res) {
    return res.locals.lang_set;
}