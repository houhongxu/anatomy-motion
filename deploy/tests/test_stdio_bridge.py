"""固定 stdio API 桥边界测试 / Fixed stdio API bridge boundary tests."""
import asyncio
import contextlib
import importlib.util
import io
import os
import socket
import sys
import tempfile
import threading
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

ROOT = Path(__file__).resolve().parents[2]

def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT/relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

api_bridge = load("ci_api_bridge","scripts/ci-api-bridge.py")
local_bridge = load("ci_local_tunnel","scripts/ci-local-tunnel.py")

def write_all(fd, data):
    remaining = memoryview(data)
    while remaining:
        remaining = remaining[os.write(fd,remaining):]

def read_all(fd):
    data = bytearray()
    while chunk := os.read(fd,65536):
        data.extend(chunk)
    return bytes(data)

class RemoteRelayTests(unittest.TestCase):
    def start_bridge(self):
        api, backend = socket.socketpair()
        input_fd, client_input = os.pipe()
        client_output, output_fd = os.pipe()
        stop = threading.Event()
        errors = []
        def worker():
            try:
                api_bridge.relay(api,input_fd,output_fd,stop=stop)
            except Exception as error:
                errors.append(error)
            finally:
                api.close()
                for fd in (input_fd,output_fd):
                    try:os.close(fd)
                    except OSError:pass
        thread = threading.Thread(target=worker,daemon=True)
        thread.start()
        def cleanup():
            stop.set()
            backend.close()
            for fd in (client_input,client_output):
                try:os.close(fd)
                except OSError:pass
            thread.join(2)
        self.addCleanup(cleanup)
        return backend,client_input,client_output,thread,stop,errors

    def test_stdin_eof_still_drains_api_response(self):
        backend,stdin,stdout,thread,stop,errors = self.start_bridge()
        write_all(stdin,b"request")
        os.close(stdin)
        received = bytearray()
        while data := backend.recv(65536):received.extend(data)
        self.assertEqual(received,b"request")
        backend.sendall(b"response after input EOF")
        backend.shutdown(socket.SHUT_WR)
        self.assertEqual(read_all(stdout),b"response after input EOF")
        thread.join(2)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors,[])

    def test_api_output_eof_does_not_discard_later_stdin(self):
        backend,stdin,stdout,thread,stop,errors = self.start_bridge()
        backend.sendall(b"early response")
        backend.shutdown(socket.SHUT_WR)
        self.assertEqual(read_all(stdout),b"early response")
        write_all(stdin,b"input after API output EOF")
        os.close(stdin)
        received = bytearray()
        while data := backend.recv(65536):received.extend(data)
        self.assertEqual(received,b"input after API output EOF")
        thread.join(2)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors,[])

    def test_large_duplex_transfer_handles_backpressure(self):
        backend,stdin,stdout,thread,stop,errors = self.start_bridge()
        payload = bytes(range(256))*12288
        def client_sender():
            write_all(stdin,payload)
            os.close(stdin)
        def api_echo():
            while data := backend.recv(65536):backend.sendall(data)
            backend.shutdown(socket.SHUT_WR)
        sender = threading.Thread(target=client_sender,daemon=True)
        echo = threading.Thread(target=api_echo,daemon=True)
        sender.start();echo.start()
        self.assertEqual(read_all(stdout),payload)
        sender.join(2);echo.join(2);thread.join(2)
        self.assertFalse(any(t.is_alive() for t in (sender,echo,thread)))
        self.assertEqual(errors,[])

    def test_stop_unblocks_idle_bridge(self):
        backend,stdin,stdout,thread,stop,errors = self.start_bridge()
        stop.set()
        thread.join(2)
        self.assertFalse(thread.is_alive())
        self.assertEqual(errors,[])

    def test_reject_client_command_and_endpoint_arguments(self):
        for argv,command in [(["ci-api-bridge.py"],"uname -a"),(["ci-api-bridge.py","127.0.0.1:22"],"")]:
            with self.subTest(argv=argv,command=command), patch.object(api_bridge.sys,"argv",argv), patch.dict(os.environ,{"SSH_ORIGINAL_COMMAND":command}), patch.object(api_bridge.socket,"create_connection") as connect, contextlib.redirect_stderr(io.StringIO()):
                self.assertEqual(api_bridge.main(),2)
                connect.assert_not_called()

    def test_main_connects_only_fixed_api_target(self):
        with patch.object(api_bridge.sys,"argv",["ci-api-bridge.py"]), patch.dict(os.environ,{"SSH_ORIGINAL_COMMAND":""}), patch.object(api_bridge.socket,"create_connection") as connect, patch.object(api_bridge,"relay"), patch.object(api_bridge.signal,"signal"):
            self.assertEqual(api_bridge.main(),0)
            connect.assert_called_once_with(("127.0.0.1",6443),timeout=10)

class RunnerRelayTests(unittest.IsolatedAsyncioTestCase):
    async def start_proxy(self, child_code, extra_args=()):
        original = asyncio.create_subprocess_exec
        children = []
        commands = []
        handlers = set()
        finished = asyncio.Event()
        async def child_factory(*args,**kwargs):
            commands.append(args)
            child = await original(sys.executable,"-u","-c",child_code,*extra_args,**kwargs)
            children.append(child)
            return child
        async def accepted(reader,writer):
            task = asyncio.current_task()
            handlers.add(task)
            try:
                await local_bridge.relay_connection(reader,writer,"/private/key","/private/known_hosts")
            finally:
                handlers.discard(task)
                finished.set()
        mocker = patch.object(local_bridge.asyncio,"create_subprocess_exec",side_effect=child_factory)
        mocker.start()
        self.addCleanup(mocker.stop)
        server = await asyncio.start_server(accepted,"127.0.0.1",0)
        async def cleanup():
            server.close();await server.wait_closed()
            for task in list(handlers):task.cancel()
            await asyncio.gather(*list(handlers),return_exceptions=True)
        self.addAsyncCleanup(cleanup)
        reader,writer = await asyncio.open_connection("127.0.0.1",server.sockets[0].getsockname()[1])
        return reader,writer,children,commands,handlers,finished

    async def test_client_half_close_delivers_complete_response(self):
        reader,writer,children,commands,handlers,finished = await self.start_proxy(
            "import sys; data=sys.stdin.buffer.read(); sys.stdout.buffer.write(b'reply:'+data); sys.stdout.flush()"
        )
        payload = b"tls opaque bytes"*100000
        writer.write(payload);await writer.drain();writer.write_eof()
        self.assertEqual(await asyncio.wait_for(reader.read(),5),b"reply:"+payload)
        writer.close();await writer.wait_closed()
        await asyncio.wait_for(finished.wait(),3)
        self.assertTrue(all(child.returncode is not None for child in children))
        command = commands[0]
        self.assertEqual(command[0],"/usr/bin/ssh")
        self.assertEqual(command[-1],"ubuntu@150.158.90.109")
        self.assertIn("-T",command)
        self.assertEqual(command[command.index("-F")+1],"/dev/null")
        self.assertIn("IdentitiesOnly=yes",command)
        self.assertIn("StrictHostKeyChecking=yes",command)
        self.assertIn("ClearAllForwardings=yes",command)
        self.assertFalse(set(command)&{"-L","-R","-D","-N"})

    async def test_upstream_half_close_allows_later_client_input(self):
        with tempfile.TemporaryDirectory() as temp:
            target=Path(temp)/"received"
            code="import sys,pathlib,os; sys.stdout.buffer.write(b'early'); sys.stdout.flush(); sys.stdout.close(); sys.stderr.close(); os.close(1); os.close(2); pathlib.Path(sys.argv[1]).write_bytes(sys.stdin.buffer.read())"
            reader,writer,children,commands,handlers,finished = await self.start_proxy(code,(str(target),))
            self.assertEqual(await asyncio.wait_for(reader.read(),3),b"early")
            writer.write(b"late client bytes");await writer.drain();writer.write_eof()
            await asyncio.wait_for(finished.wait(),3)
            self.assertEqual(target.read_bytes(),b"late client bytes")
            writer.close();await writer.wait_closed()

    async def test_cancellation_reaps_idle_ssh_child(self):
        reader,writer,children,commands,handlers,finished = await self.start_proxy("import time; time.sleep(60)")
        for _ in range(100):
            if children:break
            await asyncio.sleep(0.01)
        self.assertTrue(children)
        for task in list(handlers):task.cancel()
        await asyncio.wait_for(finished.wait(),3)
        self.assertTrue(all(child.returncode is not None for child in children))
        writer.close();await writer.wait_closed()

    async def test_failed_ssh_does_not_leave_client_or_process_open(self):
        reader,writer,children,commands,handlers,finished = await self.start_proxy("raise SystemExit(1)")
        self.assertEqual(await asyncio.wait_for(reader.read(),3),b"")
        writer.write_eof()
        await asyncio.wait_for(finished.wait(),3)
        self.assertTrue(all(child.returncode is not None for child in children))
        writer.close();await writer.wait_closed()

class SecurityTests(unittest.TestCase):
    def test_private_regular_credential_files_only(self):
        with tempfile.TemporaryDirectory() as temp:
            key=Path(temp)/"key";key.write_text("fixture");key.chmod(0o600)
            self.assertEqual(local_bridge.credential_file(str(key)),str(key))
            link=Path(temp)/"link";link.symlink_to(key)
            with self.assertRaises(ValueError):local_bridge.credential_file(str(link))
            key.chmod(0o644)
            with self.assertRaises(ValueError):local_bridge.credential_file(str(key))

    def test_runner_listener_and_workflow_use_only_fixed_stdio_bridge(self):
        self.assertEqual(local_bridge.LISTEN,("127.0.0.1",16443))
        text=(ROOT/".github/workflows/preview.yml").read_text()
        self.assertIn("python3 scripts/ci-local-tunnel.py",text)
        self.assertIn('wait "$tunnel_pid"',text)
        self.assertNotIn("ssh -N",text)
        self.assertNotIn("-L 127.0.0.1",text)

if __name__=="__main__":
    unittest.main()
