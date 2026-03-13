/* istanbul ignore next */
const asyncMiddleware = fn =>
    (req, res, next) => {
        try {
            Promise.resolve(fn(req, res, next))
                .catch(function (ex) {
                    res.status(500).send();
                    next(ex, req, res);
                });
        } catch (ex) {

            res.status(500).send();
            next(ex, req, res);
        }
    };

module.exports = asyncMiddleware;