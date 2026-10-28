#!/usr/bin/env python3
"""固定 Kubernetes API stdio 桥 / Fixed Kubernetes API stdio bridge."""
import os
import select
import signal
import socket
import sys
import threading

TARGET = ("127.0.0.1", 6443)
CHUNK_SIZE = 65536
MAX_BUFFER = 1024 * 1024

def relay(api, input_fd, output_fd, *, stop=None, close_output=None):
    """在固定 API socket 与 SSH stdio 间传输；保留两个方向的 EOF。"""
    stop = stop or threading.Event()
    close_output = close_output or (lambda: os.close(output_fd))
    old_input = os.get_blocking(input_fd)
    old_output = os.get_blocking(output_fd)
    old_timeout = api.gettimeout()
    os.set_blocking(input_fd, False)
    os.set_blocking(output_fd, False)
    api.setblocking(False)
    to_api, to_ssh = bytearray(), bytearray()
    input_open = api_read_open = api_write_open = output_open = True
    try:
        while not stop.is_set():
            if not input_open and not to_api and api_write_open:
                api.shutdown(socket.SHUT_WR)
                api_write_open = False
            if not api_read_open and not to_ssh and output_open:
                close_output()
                output_open = False
            if not input_open and not api_read_open and not to_api and not to_ssh:
                break
            readers = []
            writers = []
            if input_open and len(to_api) < MAX_BUFFER:
                readers.append(input_fd)
            if api_read_open and len(to_ssh) < MAX_BUFFER:
                readers.append(api)
            if to_api:
                writers.append(api)
            if to_ssh:
                writers.append(output_fd)
            readable, writable, _ = select.select(readers, writers, [], 0.25)
            if input_fd in readable:
                try:
                    data = os.read(input_fd, min(CHUNK_SIZE, MAX_BUFFER-len(to_api)))
                    if data:
                        to_api.extend(data)
                    else:
                        input_open = False
                except BlockingIOError:
                    pass
            if api in readable:
                try:
                    data = api.recv(min(CHUNK_SIZE, MAX_BUFFER-len(to_ssh)))
                    if data:
                        to_ssh.extend(data)
                    else:
                        api_read_open = False
                except BlockingIOError:
                    pass
            if api in writable:
                try:
                    sent = api.send(to_api)
                    if not sent:
                        raise ConnectionError("API connection stopped accepting data")
                    del to_api[:sent]
                except BlockingIOError:
                    pass
            if output_fd in writable:
                try:
                    sent = os.write(output_fd, to_ssh)
                    if not sent:
                        raise ConnectionError("SSH output stopped accepting data")
                    del to_ssh[:sent]
                except BlockingIOError:
                    pass
    finally:
        for fd, previous in ((input_fd, old_input), (output_fd, old_output)):
            try:
                os.set_blocking(fd, previous)
            except OSError:
                pass
        try:
            api.settimeout(old_timeout)
        except OSError:
            pass

def main():
    if len(sys.argv) != 1 or os.environ.get("SSH_ORIGINAL_COMMAND", ""):
        print("Only the fixed API bridge is allowed / 仅允许固定 API 桥", file=sys.stderr)
        return 2
    stop = threading.Event()
    for name in (signal.SIGTERM, signal.SIGINT):
        signal.signal(name, lambda *_: stop.set())
    def close_ssh_output():
        # SSH sends output EOF after both stdout and stderr close.
        sys.stdout.close()
        sys.stderr.close()
        os.close(1)
        os.close(2)
    try:
        with socket.create_connection(TARGET, timeout=10) as api:
            relay(api, 0, 1, stop=stop, close_output=close_ssh_output)
    except (OSError, ConnectionError):
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
