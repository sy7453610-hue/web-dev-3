function logger(req, res, next) {
    console.log(`${req.method} ${req.url}`);
    console.log("Time:", new Date().toLocaleString());

    next();
}

module.exports = logger;