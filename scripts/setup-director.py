#!/usr/bin/env python3
"""Install the local director model during setup; never called by builds."""
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / '.explain-to-me' / 'models' / 'director'
NAME = 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf'
REVISION = 'a06e946bb6b655725eafa393f4a9745d460374c9'
EXPECTED = '3605803b982cb64aead44f6c1b2ae36e3acdb41d8e46c8a94c6533bc4c67e597'
SOURCE = 'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/' + REVISION + '/' + NAME


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b''):
            digest.update(block)
    return digest.hexdigest()


def main():
    executable = shutil.which('llama-server')
    if not executable:
        raise RuntimeError('Install llama.cpp / llama-server during setup before installing this director model')
    binary = Path(executable).resolve()
    version = subprocess.run([str(binary), '--version'], check=True, text=True, capture_output=True)
    runtime_version = (version.stdout + version.stderr).strip()
    DIRECTORY.mkdir(parents=True, exist_ok=True, mode=0o700)
    destination = DIRECTORY / NAME
    if destination.is_symlink():
        raise RuntimeError('Refusing a symlink model destination')
    if not destination.exists() or sha256(destination) != EXPECTED:
        print('Downloading pinned local director model:', NAME, flush=True)
        temporary = None
        try:
            with tempfile.NamedTemporaryFile(dir=DIRECTORY, prefix='model-', delete=False) as output:
                temporary = Path(output.name)
                request = urllib.request.Request(SOURCE, headers={'User-Agent': 'explain-to-me-setup'})
                received = 0
                checkpoint = 128 * 1024 * 1024
                with urllib.request.urlopen(request, timeout=120) as response:
                    while True:
                        block = response.read(4 * 1024 * 1024)
                        if not block:
                            break
                        output.write(block)
                        received += len(block)
                        if received >= checkpoint:
                            print('Downloaded bytes:', received, flush=True)
                            checkpoint += 128 * 1024 * 1024
            actual = sha256(temporary)
            if actual != EXPECTED:
                raise RuntimeError('Director model checksum mismatch: ' + actual)
            os.replace(temporary, destination)
        finally:
            if temporary is not None and temporary.exists():
                temporary.unlink()
    provenance = {
        'model': 'Qwen3-4B-Instruct-2507-Q4_K_M',
        'revision': REVISION,
        'filename': NAME,
        'modelSha256': EXPECTED,
        'bytes': destination.stat().st_size,
        'source': SOURCE,
        'executable': str(binary),
        'executableSha256': sha256(binary),
        'runtimeVersion': runtime_version,
        'license': 'Apache-2.0',
        'licenseSuitabilityApproved': False,
        'references': [
            'https://huggingface.co/Qwen/Qwen3-4B-Instruct-2507',
            'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF',
            'https://github.com/ggml-org/llama.cpp',
        ],
        'setupDownloadsOnly': True,
    }
    (DIRECTORY / 'provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')
    print(json.dumps(provenance, indent=2), flush=True)


if __name__ == '__main__':
    main()
