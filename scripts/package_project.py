"""Package only the deliverables, with a freshly initialized database."""
from pathlib import Path
import sys
import tempfile
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from server import connect, init_store


def main():
    members = [ROOT / name for name in ("README.md", "Iniciar.cmd", "server.py", "webapp.py", "schema.sql", ".gitignore")]
    for directory in ("public", "scripts", "tests"):
        members.extend(p for p in (ROOT / directory).rglob("*") if p.is_file()
                       and "__pycache__" not in p.parts and p.suffix != ".pyc")
    output = ROOT / "Pulso_Propio_Local.zip"
    with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
        db = init_store(Path(tmp))
        with connect(db) as connection:
            assert connection.execute("SELECT COUNT(*) FROM feedback").fetchone()[0] == 0
        staged = Path(tmp) / output.name
        with ZipFile(staged, "w", compression=ZIP_DEFLATED, compresslevel=6) as archive:
            for item in sorted(members):
                archive.write(item, "Pulso_Propio/" + item.relative_to(ROOT).as_posix())
            archive.write(db, "Pulso_Propio/data/pulso.sqlite3")
        with ZipFile(staged) as archive:
            if archive.testzip():
                raise RuntimeError("El ZIP no pasó la verificación de integridad.")
            print(f"{len(archive.namelist())} archivos verificados.")
        staged.replace(output)
    print(f"{output.name} ({output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
