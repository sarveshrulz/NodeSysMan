const express = require("express")
const app = express()
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path")
const port = process.env.PORT || 3000
const {NodeSSH} = require("node-ssh")

app.use(express.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"))
})

app.get("/info", (req, res) => {
    res.sendFile(path.join(__dirname, "info.html"));
})

app.post("/", (req, res) => {
    const sshAuth = new NodeSSH()

    host = {
        host: "localhost",
        username: req.body.username,
        password: req.body.password
    }

    sshAuth.connect(host).then(() => {
        res.redirect("/info")
        sshAuth.dispose()
    }).catch((err) => {
        res.redirect("/")
        setTimeout(() => {
            io.of("/").emit("authFailed", err.toString("utf-8") + ", please try again...")
        }, 200)
    })
})

io.of("/").on("connect", (socket) => {
    console.log("Connected to /")

    socket.on("disconnect", () => {
        console.log("Disconnected from /")
    })
})

io.of("/info").on("connect", (socket) => {
    const sshInfo = new NodeSSH()

    console.log("Connected on /info")

    if (typeof host != "undefined") {
        sshInfo.connect(host).then(() => {
            let interval = setInterval(() => {
                if (sshInfo.isConnected()) {
                    sshInfo.execCommand("cat /etc/hostname").then((result) => {
                        socket.emit("hostname", result.stdout)
                    })
                    sshInfo.execCommand("uptime | awk '{ print $3 $4}'").then((result) => {
                        socket.emit("uptime", result.stdout)
                    })
                    sshInfo.execCommand("free -m").then((result) => {
                        socket.emit("memory", result.stdout)
                    })
                } else {
                    clearInterval(interval)
                }
            }, 300)
        })
    } else {
        socket.emit("redirectRoot")
    }

    socket.on("disconnect", () => {
        console.log("Disconnected from /info")
        sshInfo.dispose()
    })
})

http.listen(port, () => {
    console.log("Server listening on port", port)
})
