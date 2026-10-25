#!/usr/bin/env python3
"""仅本机监听的 CI API 代理 / Loopback-only CI API proxy over fixed SSH stdio."""
import argparse
import asyncio
import os
import signal
import stat
import sys
from pathlib import Path

LISTEN = ("127.0.0.1", 16443)
REMOTE = "ubuntu@150.158.90.109"
CHUNK_SIZE = 65536
MAX_CONNECTIONS = 32

def credential_file(value):
    path = Path(value).expanduser()
    if path.is_symlink() or not path.is_file():
        raise ValueError("Credential must be a regular file")
    info = path.stat()
    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) & 0o077:
        raise ValueError("Credential files must be owned by the current user and private")
    return str(path.resolve())

def ssh_command(identity, known_hosts):
    return [
        "/usr/bin/ssh", "-F", "/dev/null", "-T",
        "-o", "BatchMode=yes", "-o", "IdentitiesOnly=yes",
        "-o", "StrictHostKeyChecking=yes", "-o", "UserKnownHostsFile=" + known_hosts,
        "-o", "ClearAllForwardings=yes", "-o", "ForwardAgent=no",
        "-o", "ControlMaster=no", "-o", "ControlPath=none",
        "-o", "ServerAliveInterval=30", "-o", "ServerAliveCountMax=3",
        "-o", "ConnectTimeout=10", "-i", identity, REMOTE,
    ]

async def pipe_to_ssh(reader, stdin):
    while data := await reader.read(CHUNK_SIZE):
        stdin.write(data)
        await stdin.drain()
    stdin.close()
    await stdin.wait_closed()

async def pipe_from_ssh(stdout, writer):
    while data := await stdout.read(CHUNK_SIZE):
        writer.write(data)
        await writer.drain()
    if writer.can_write_eof():
        writer.write_eof()
        await writer.drain()

async def relay_connection(reader, writer, identity, known_hosts):
    child = None
    stderr_task = None
    pumps = []
    try:
        child = await asyncio.create_subprocess_exec(
            *ssh_command(identity, known_hosts),
            stdin=asyncio.subprocess.PIPE, stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE, limit=CHUNK_SIZE, start_new_session=True,
        )
        async def drain_errors():
            # Drain SSH errors without retaining unbounded data or exposing TLS bytes.
            tail = b""
            while data := await child.stderr.read(4096):
                tail = (tail + data)[-4096:]
            return tail
        stderr_task = asyncio.create_task(drain_errors())
        pumps = [asyncio.create_task(pipe_to_ssh(reader, child.stdin)), asyncio.create_task(pipe_from_ssh(child.stdout, writer))]
        await asyncio.gather(*pumps)
    except (asyncio.CancelledError, OSError, ConnectionError):
        pass
    finally:
        for task in pumps:
            task.cancel()
        await asyncio.gather(*pumps, return_exceptions=True)
        if child is not None:
            if child.stdin is not None:
                child.stdin.close()
            if child.returncode is None:
                try:
                    child.terminate()
                except ProcessLookupError:
                    pass
                try:
                    await asyncio.wait_for(child.wait(), 2)
                except asyncio.TimeoutError:
                    try:
                        child.kill()
                    except ProcessLookupError:
                        pass
                    await child.wait()
            else:
                await child.wait()
        if stderr_task is not None:
            stderr_task.cancel()
            await asyncio.gather(stderr_task, return_exceptions=True)
        writer.close()
        try:
            await writer.wait_closed()
        except (OSError, ConnectionError):
            pass

async def run(identity, known_hosts):
    stop = asyncio.Event()
    tasks = set()
    loop = asyncio.get_running_loop()
    for name in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(name, stop.set)

    async def accepted(reader, writer):
        if len(tasks) >= MAX_CONNECTIONS or stop.is_set():
            writer.close()
            return
        task = asyncio.current_task()
        tasks.add(task)
        try:
            await relay_connection(reader, writer, identity, known_hosts)
        finally:
            tasks.discard(task)

    server = await asyncio.start_server(accepted, *LISTEN, limit=CHUNK_SIZE)
    try:
        await stop.wait()
    finally:
        server.close()
        await server.wait_closed()
        active = list(tasks)
        for task in active:
            task.cancel()
        await asyncio.gather(*active, return_exceptions=True)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--identity-file", required=True)
    parser.add_argument("--known-hosts-file", required=True)
    args = parser.parse_args()
    try:
        identity = credential_file(args.identity_file)
        known_hosts = credential_file(args.known_hosts_file)
        asyncio.run(run(identity, known_hosts))
    except (ValueError, OSError) as error:
        print("CI API proxy failed / CI API 代理失败: " + str(error), file=sys.stderr)
        return 1
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
