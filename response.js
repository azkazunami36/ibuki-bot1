const http = require('http'),
    qs = require('qs');
try {
    http.createServer(function (req, res) {
        if (req.method == "POST") {
            var data = "";
            req.on("data", function (chunk) {
                data += chunk;
            });
            req.on("end", function () {
                if (!data) {
                    console.log("何かが送信されたため、Botが立ち上がりました。");
                    res.end();
                    return;
                }
                var dataObject = qs.parse(data);
                if (dataObject.type == "wake") {
                    console.log("Botを立ち上げるためにwakeが送信されました。");
                    res.end();
                    return;
                } else {
                    console.log("Post内容:" + dataObject.type);
                }
                res.end();
            });
        }
        else if (req.method == 'GET') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Discord Bot is active now\n');
        }
    }).listen(3000);
} catch (e) {
    console.log("httpでエラー:" + e.message);
};