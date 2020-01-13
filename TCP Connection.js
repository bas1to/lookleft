navigator.tcpPermission.requestPermission({remoteAddress:"127.0.0.1", remotePort:6789}).then(
    () => {
        // permission was granted
        // create a new TCP client socket and connect to remote host
        var mySocket = new TCPSocket("127.0.0.1", 6789);

        // send data to server
        mySocket.writeable.write("Warning!").then(
            () => {

                // data sent successfully, wait for response
                console.log("Warning has been sent to Warning Device");
                mySocket.readable.getReader().read().then(
                    ({ value, done }) => {
                        if (!done) {
                            // response received, log it:
                            console.log("Warning received from server:" + value);
                        }

                        // close the TCP connection
                        mySocket.close();
                    }
                );
            },
            e => console.error("Sending error:", e)
        );
    }
);