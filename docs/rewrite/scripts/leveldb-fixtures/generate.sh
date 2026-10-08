#!/bin/sh
# Writes the localStorage items in tests/shared/lib/migration/fixtures/chrome-local-storage/expected.json
# with a real headless Chrome, and copies the LevelDB files it leaves into that fixture folder.
set -eu
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../../.." && pwd)
fixture="$repo/tests/shared/lib/migration/fixtures/chrome-local-storage"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

expected=$(cat "$fixture/expected.json")
cat > "$work/first.html" <<HTML
<!doctype html><title>first</title><script>
localStorage.setItem("lazify-theme", "light");
localStorage.setItem("lazify-removed", "gone soon");
const bulk = "x".repeat(60000);
for (let index = 0; index < 120; index += 1) localStorage.setItem("bulk-" + index, bulk + index);
document.title = "written";
</script>
HTML
cat > "$work/second.html" <<HTML
<!doctype html><title>second</title><script>
const expected = $expected;
for (let index = 0; index < 120; index += 1) localStorage.removeItem("bulk-" + index);
localStorage.removeItem("lazify-removed");
for (const [key, value] of Object.entries(expected)) localStorage.setItem(key, value);
document.title = "written";
</script>
HTML

chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
run() {
  "$chrome" --headless=new --no-first-run --no-default-browser-check --disable-extensions \
    --user-data-dir="$work/profile" "file://$work/$1" >/dev/null 2>&1 &
  pid=$!
  sleep 12
  kill -TERM "$pid"
  wait "$pid" 2>/dev/null || true
}
run first.html
run second.html

rm -rf "$fixture/leveldb"
mkdir -p "$fixture/leveldb"
for file in "$work/profile/Default/Local Storage/leveldb"/*; do
  case "$(basename "$file")" in LOCK | LOG | LOG.old) ;; *) cp "$file" "$fixture/leveldb/" ;; esac
done
ls -la "$fixture/leveldb"
