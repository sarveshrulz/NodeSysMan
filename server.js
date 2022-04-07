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

app.get("/monitor", (req, res) => {
    res.sendFile(path.join(__dirname, "monitor.html"));
})

app.get("/logs", (req, res) => {
    res.sendFile(path.join(__dirname, "logs.html"));
})

app.get("/accounts", (req, res) => {
    res.sendFile(path.join(__dirname, "accounts.html"));
})

app.get("/disks", (req, res) => {
    res.sendFile(path.join(__dirname, "disks.html"));
})

app.get("/terminal", (req, res) => {
    res.sendFile(path.join(__dirname, "terminal.html"));
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
                ssh.execCommand("echo $USER").then((result) => {
                    socket.emit("user", result.stdout)
                })
                ssh.execCommand("hostnamectl | grep 'Static hostname' | awk '{ print $3 }'").then((result) => {
                    socket.emit("hostname", result.stdout)
                })
                ssh.execCommand("hostnamectl | grep 'Operating System' | awk '{ print $3 }'").then((result) => {
                    socket.emit("os", result.stdout)
                })
                ssh.execCommand("uname -r").then((result) => {
                    socket.emit("kernel", result.stdout)
                })
                ssh.execCommand("awk '{print int($1/3600)\":\"int(($1%3600)/60)\":\"int($1%60)}' /proc/uptime").then((result) => {
                    socket.emit("uptime", result.stdout)
                })
            } else {
                clearInterval(interval)
            }
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Error: please login first")
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

io.of("/monitor").on("connect", (socket) => {
    console.log("Connected on /monitor")
    if (allowRoutes) {
        allowRoutes = false
        keepSsh = false
        let interval = setInterval(() => {
            if (ssh.isConnected()) {
                ssh.execCommand("echo \"$[100-$(vmstat 1 2|tail -1|awk '{print $15}')]\"").then((result) => {
                    socket.emit("cpu", result.stdout)
                })
                ssh.execCommand("expr $(cat /sys/class/hwmon/hwmon4/temp1_input) / 1000").then((result) => {
                    socket.emit("cpuTemp", result.stdout)
                })
                ssh.execCommand("cat /sys/devices/system/cpu/cpu0/cpufreq/scaling_governor").then((result) => {
                    socket.emit("cpuGov", result.stdout)
                })
                ssh.execCommand("python -c \"print(round($(free -m | grep 'Mem' | awk '{ print $3 }')/$(free -m | grep 'Mem' | awk '{ print $2 }')*100))\"").then((result) => {
                    socket.emit("memory", result.stdout)
                })
                ssh.execCommand("python -c \"print(round($(free -m | grep 'Swap' | awk '{ print $3 }')/$(free -m | grep 'Swap' | awk '{ print $2 }')*100))\"").then((result) => {
                    socket.emit("swap", result.stdout)
                })
            } else {
                clearInterval(interval)
            }
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Error: please login first")
        }, 200)
    }

    socket.on("initRoutes", () => {
        allowRoutes = true
        keepSsh = true
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from /monitor")
        if (!keepSsh) {
            ssh.dispose()
        }
    })
})

io.of("/logs").on("connect", (socket) => {
    console.log("Connected on /logs")

    if (allowRoutes) {
        allowRoutes = false
        keepSsh = false
        let interval = setInterval(() => {
            if (ssh.isConnected()) {
                ssh.execCommand("systemctl --failed").then((result) => {
                    socket.emit("systemctlFailed", result.stdout)
                })
            } else {
                clearInterval(interval)
            }
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Error: please login first")
        }, 200)
    }

    socket.on("initRoutes", () => {
        allowRoutes = true
        keepSsh = true
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from /logs")
        if (!keepSsh) {
            ssh.dispose()
        }
    })
})

io.of("/accounts").on("connect", (socket) => {
    console.log("Connected on /accounts")

    if (allowRoutes) {
        allowRoutes = false
        keepSsh = false
        let interval = setInterval(() => {
            if (ssh.isConnected()) {
                ssh.execCommand("groups").then((result) => {
                    socket.emit("groups", result.stdout)
                })
            } else {
                clearInterval(interval)
            }
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Error: please login first")
        }, 200)
    }

    socket.on("initRoutes", () => {
        allowRoutes = true
        keepSsh = true
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from /accounts")
        if (!keepSsh) {
            ssh.dispose()
        }
    })
})

io.of("/disks").on("connect", (socket) => {
    console.log("Connected on /disks")

    if (allowRoutes) {
        allowRoutes = false
        keepSsh = false
        let interval = setInterval(() => {
            if (ssh.isConnected()) {
                ssh.execCommand("lsblk -e 253").then((result) => {
                    socket.emit("disks", result.stdout)
                })
                ssh.execCommand("df -h").then((result) => {
                    socket.emit("space", result.stdout)
                })
            } else {
                clearInterval(interval)
            }
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Error: please login first")
        }, 200)
    }

    socket.on("initRoutes", () => {
        allowRoutes = true
        keepSsh = true
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from /disks")
        if (!keepSsh) {
            ssh.dispose()
        }
    })
})

io.of("/terminal").on("connect", (socket) => {
    console.log("Connected on /terminal")

    if (allowRoutes) {
        allowRoutes = false
        keepSsh = false
        let interval = setInterval(() => {
            //
        }, 300)
    } else {
        socket.emit("redirectRoot")
        setTimeout(() => {
            io.of("/").emit("authFailed", "Error: please login first")
        }, 200)
    }

    socket.on("initRoutes", () => {
        allowRoutes = true
        keepSsh = true
    })

    socket.on("disconnect", () => {
        console.log("Disconnected from /terminal")
        if (!keepSsh) {
            ssh.dispose()
        }
    })
})

http.listen(port, () => {
    console.log("Server listening on port", port)
})
