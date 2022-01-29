const http = require('http');
const url = require('url');
const { doGetRequest } = require('./server/staticFiles');
const { initialize, registerReq, joinReq, setEventSrc, notifyReq, leaveReq, rankingReq } = require('./server/requests.js');
const PORT = 8989;

initialize();

http.createServer(function (req, res) {
    if (req.method === "GET") {
        let get = getMethod(req, res); // For more gets
        if (get) {
            return;
        }
        // Must come after because will give 403 or 404 if isn't a valid file
        doGetRequest(req, res);
    }
    else if (req.method === "POST") {
        postMethod(req, res);
    }
    else {
        notFound(res);
    }

}).listen(PORT);


function getMethod(req, res) {
    let purl = url.parse(req.url, true);
    if (purl.pathname == "/update") {
        let query = purl.query
        setEventSrc(req, res, query);
        return true;
    }

    return false;
}

function postMethod(req, res) {
    let message = '';
    req.on('data', chunk => {
        message += chunk;

    })
    req.on('end', () => {
        chooseRoute(req, res, JSON.parse(message));
    });
}

function chooseRoute(req, res, data) {
    let purl = url.parse(req.url);
    let pathname = purl.pathname;
    if (pathname == '/register') {
        registerReq(res, data);
    }
    else if (pathname == '/join') {
        joinReq(res, data);
    }
    else if (pathname == '/notify') {
        notifyReq(res, data);
    }
    else if (pathname == '/leave') {
        leaveReq(res, data);
    }
    else if (pathname == '/ranking') {
        rankingReq(res);
    }
    else {
        notFound(res);
    }
}

function notFound(res) {
    res.writeHead(404);
    res.end();
}