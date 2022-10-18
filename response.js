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
                if (!data) data += "type=null";
                var dataObject = qs.parse(data);
                console.log("Postされました。", dataObject);
                res.end();
            });
        } else if (req.method == "GET") {
            res.writeHead(200, { "Content-Type": "text/plain" });
            res.end("音楽botは現在動作しています！");
        };
    }).listen(process.env.PORT || 3000);
} catch (e) {
    console.log("httpでエラー:" + e.message);
};