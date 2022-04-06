const express = require("express")
const app = express()
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path")
const port = process.env.PORT || 3000
const { NodeSSH } = require("node-ssh");
const ssh = new NodeSSH

let allowRoutes = false
let keepSsh = false

app.use(express.urlencoded({ extended: true }))

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"))
})

app.get("/info", (req, res) => {
    res.sendFile(path.join(__dirname, "info.html"));
})

app.get("/test", (req, res) => {
    res.sendFile(path.join(__dirname, "test.html"));
})

app.post("/", (req, res) => {
    let host = {
        host: "localhost",
        username: req.body.username,
        password: req.body.password
    }

    ssh.connect(host).then(() => {
        allowRoutes = true
        res.redirect("/info")
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
    console.log("Connected on /info")

    if (allowRoutes) {
        allowRoutes = false
        keepSsh = false
        let interval = setInterval(() => {
            if (ssh.isConnected()) {
                ssh.execCommand("cat /etc/hostname").then((result) => {
                    socket.emit("hostname", result.stdout)
                })
                ssh.execCommand("uptime | awk '{ print $3 $4}'").then((result) => {
                    socket.emit("uptime", result.stdout)
                })
                ssh.execCommand("free -m").then((result) => {
                    socket.emit("memory", result.stdout)
                })
            } else {
                clearInterval(interval)
            }
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Please login first")
        }, 200)
    }

    socket.on("initRoutes", () => {
        allowRoutes = true
        keepSsh = true
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from /info")
        if (!keepSsh) {
            ssh.dispose()
        }
    })
})

io.of("/test").on("connect", (socket) => {
    console.log("Connected on /test")
    if (allowRoutes) {
        allowRoutes = false
        keepSsh = false
        let interval = setInterval(() => {
            if (ssh.isConnected()) {
                ssh.execCommand("uptime | awk '{ print $3 $4}'").then((result) => {
                    socket.emit("uptime", result.stdout)
                })
                ssh.execCommand("free -m").then((result) => {
                    socket.emit("memory", result.stdout)
                })
            } else {
                clearInterval(interval)
            }
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Please login first")
        }, 200)
    }

    socket.on("initRoutes", () => {
        allowRoutes = true
        keepSsh = true
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from /info")
        if (!keepSsh) {
            ssh.dispose()
        }
    })
})

http.listen(port, () => {
    console.log("Server listening on port", port)
})
