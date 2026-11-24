"""Ephemeral test server. The optional pipe carries actual HTTP handler responses."""
import base64
import http.client
import json
import os
from pathlib import Path
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import Handler, create_server, set_password
from test_server import MemoryTransport

with tempfile.TemporaryDirectory() as temp, create_server("127.0.0.1", 0, temp) as server:
    set_password(server.db_path, os.environ["PULSO_TEST_PASSWORD"])
    print(json.dumps({"port": server.server_port}), flush=True)
    if "--pipe" not in sys.argv:
        server.serve_forever()
    else:
        for line in sys.stdin:
            request = json.loads(line)
            headers = request["headers"]
            body = base64.b64decode(request["body"])
            headers["content-length"] = str(len(body))
            raw = f'{request["method"]} {request["path"]} HTTP/1.0\r\n'
            raw += "".join(f"{k}: {v}\r\n" for k,v in headers.items()) + "\r\n"
            wire = MemoryTransport(raw.encode("latin1") + body)
            Handler(wire, ("127.0.0.1", 12345), server)
            result = http.client.HTTPResponse(MemoryTransport(wire.outgoing.getvalue()))
            result.begin()
            print(json.dumps({"id":request["id"], "status":result.status,
                              "headers": dict(result.getheaders()),
                              "body":base64.b64encode(result.read()).decode("ascii")}), flush=True)
