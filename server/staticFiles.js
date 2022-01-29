const path = require('path');
const url = require('url');
const fs = require('fs');
const conf = require('./conf.js');

module.exports.doGetRequest = function (request, response) {
    const pathname = getPathname(request);
    if (pathname === null) {
        response.writeHead(403); // Forbidden
        response.end();
        // return false;
    } else {
        fs.stat(conf.defaultDir + pathname, (err, stats) => {
            if (err) {
                response.writeHead(500); // Internal Server Error
                response.end();
            } else if (stats.isDirectory()) {
                if (pathname.endsWith('/')) {
                    doGetPathname(pathname + conf.defaultIndex, response);
                }
                else {
                    response.writeHead(301, // Moved Permanently
                        { 'Location': pathname + '/' });
                    response.end();
                }
            } else {
                doGetPathname(pathname, response);
            }
        });
    }
}

function getPathname(request) {
    const purl = url.parse(request.url);
    let pathname = path.posix.normalize(purl.pathname);
    if (!pathname.startsWith(conf.documentRoot)) {
        pathname = null;
    }

    return pathname;
}

function doGetPathname(pathname, response) {
    const mediaType = getMediaType(pathname);
    const encoding = isText(mediaType) ? "utf8" : null;
    fs.readFile(conf.defaultDir + pathname, encoding, (err, data) => {
        if (err) {
            response.writeHead(404); // Not Found
            response.end();
        } else {
            response.writeHead(200, { 'Content-Type': mediaType });
            response.end(data);
        }
    });
}

function getMediaType(pathname) {
    const pos = pathname.lastIndexOf('.');
    let mediaType;

    if (pos !== -1)
        mediaType = conf.mediaTypes[pathname.substring(pos + 1)];

    if (mediaType === undefined)
        mediaType = 'text/plain';
    return mediaType;
}

function isText(mediaType) {
    if (mediaType.startsWith('image'))
        return false;
    else
        return true;
}
