"""HTTP server for numeric loopback addresses, without reverse DNS on startup."""
from http.server import ThreadingHTTPServer
from socketserver import TCPServer


class LoopbackHTTPServer(ThreadingHTTPServer):
    def server_bind(self):
        # HTTPServer normally resolves a hostname here. Our URLs always use
        # the numeric address, so DNS adds no value and can delay Mac startup.
        TCPServer.server_bind(self)
        self.server_name, self.server_port = self.server_address[:2]
