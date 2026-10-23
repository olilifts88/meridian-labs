"""Stream plain/Zstandard logs without changing source files or installing packages."""
import os
import shutil
import subprocess
from contextlib import contextmanager
from pathlib import Path


class LogReadError(Exception):
    pass


def resolve_log(path):
    path = Path(path)
    if path.exists():
        return path
    compressed = Path(str(path) + '.zst')
    if path.suffix == '.jsonl' and compressed.exists():
        return compressed
    return path


def node_binary():
    configured = os.environ.get('MERIDIAN_NODE')
    candidate = configured or shutil.which('node')
    if candidate and Path(candidate).is_file():
        return candidate
    raise LogReadError('Zstandard logs require Node with built-in Zstandard support; set MERIDIAN_NODE.')



@contextmanager
def open_log(path):
    path = resolve_log(path)
    process = None
    stream = None
    try:
        if path.suffix == '.zst':
            code = """const fs=require('node:fs'),z=require('node:zlib');
if(typeof z.createZstdDecompress!=='function'){console.error('Built-in Zstandard unavailable');process.exit(2)}
require('node:stream').pipeline(fs.createReadStream(process.argv[1]),z.createZstdDecompress(),process.stdout,e=>{if(e){console.error(e.message);process.exitCode=2}});"""
            process = subprocess.Popen([node_binary(), '-e', code, str(path)],
                                       stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                                       text=True, encoding='utf-8')
            stream = process.stdout
        else:
            stream = path.open(encoding='utf-8')
        yield stream
        if process:
            error = process.stderr.read()
            if process.wait() != 0:
                raise LogReadError('Compressed log could not be read')
    except (OSError, UnicodeError) as error:
        raise LogReadError('Log unavailable or invalid UTF-8: ' + str(error)) from error
    finally:
        if stream:
            stream.close()
        if process:
            if process.poll() is None:
                process.terminate()
                process.wait()
            process.stderr.close()
