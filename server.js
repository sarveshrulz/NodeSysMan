const app = require("express")();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");
const { exec } = require("child_process");
const port = process.env.PORT || 3000;

app.get("/", (req,res) => {
    res.sendFile(path.join(__dirname, "src/index.html"));
});

io.on("connection", socket => {
    console.log("A user connected");
    // socket.on("message", msg => {
    //     console.log("Client msg:", msg);
    // });
    setInterval(() => {
        exec("free -m", (error, stdout, stderror) => {
            socket.emit("server", stdout);
        });
    }, 300)
    socket.on("disconnect", () => {
        console.log("A user disconnected");
    });
});

http.listen(port, () => {
    console.log("Server listening on port", port);
});
