#!/usr/bin/env bash
set -euo pipefail
umask 077

deploy_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
work=$(mktemp -d)
caddy_pid=
cleanup() {
  if [[ -n "$caddy_pid" ]]; then
    kill "$caddy_pid" 2>/dev/null || true
    wait "$caddy_pid" 2>/dev/null || true
  fi
  rm -rf -- "$work"
}
trap cleanup EXIT

port=${ULNAR_SMOKE_PORT:-18443}
if [[ ! "$port" =~ ^[0-9]{4,5}$ ]] || (( 10#$port < 1024 || 10#$port > 65535 )); then
  echo 'ULNAR_SMOKE_PORT doit être un port entre 1024 et 65535.' >&2
  exit 1
fi

caddy_bin=${ULNAR_SMOKE_CADDY:-caddy}
export XDG_CONFIG_HOME="$work/config"
export XDG_DATA_HOME="$work/data"
export ULNAR_SITE_ADDRESS="https://127.0.0.1:$port"
export ULNAR_RELEASE_ROOT="$work/current"
export ULNAR_AUTH_FILE="$work/guests.caddy"

mkdir -p "$work/releases/v1/assets" "$work/releases/v2/assets"
printf '%s\n' 'fixture-release-v1' > "$work/releases/v1/index.html"
printf '%s\n' 'fixture-release-v2' > "$work/releases/v2/index.html"
printf '%s\n' 'fixture-static-asset' > "$work/releases/v1/assets/main.js"
cp -- "$work/releases/v1/assets/main.js" "$work/releases/v2/assets/main.js"
printf '%s\n' 'fixture-outside-web-root' > "$work/undertest.xlsx"
ln -s -- releases/v1 "$ULNAR_RELEASE_ROOT"

password='fixture-only-password'
hash=$("$caddy_bin" hash-password --plaintext "$password")
printf 'fixture %s\n' "$hash" > "$ULNAR_AUTH_FILE"

cat > "$work/Caddyfile" <<EOF
{
	admin unix/$work/admin.sock
	auto_https disable_redirects
	default_bind 127.0.0.1
	local_certs
	skip_install_trust
}
import "$deploy_dir/Caddyfile.example"
EOF

"$caddy_bin" validate --config "$work/Caddyfile" --adapter caddyfile
"$caddy_bin" run --config "$work/Caddyfile" --adapter caddyfile > "$work/log" 2>&1 &
caddy_pid=$!
ca="$XDG_DATA_HOME/caddy/pki/authorities/local/root.crt"

request() {
  curl --disable --noproxy 127.0.0.1 --silent --show-error --max-time 5 --cacert "$ca" "$@"
}

ready=false
for (( attempt = 0; attempt < 50; attempt++ )); do
  if [[ -s "$ca" ]] && request --output /dev/null "$ULNAR_SITE_ADDRESS/" 2>/dev/null; then
    ready=true
    break
  fi
  kill -0 "$caddy_pid" 2>/dev/null || break
  sleep 0.1
done
if [[ "$ready" != true ]]; then
  cat "$work/log" >&2
  exit 1
fi

expect_status() {
  local expected=$1 actual
  shift
  actual=$(request --output "$work/body" --dump-header "$work/headers" --write-out '%{http_code}' "$@")
  if [[ "$actual" != "$expected" ]]; then
    printf 'HTTP %s attendu, HTTP %s reçu pour %s\n' "$expected" "$actual" "${!#}" >&2
    return 1
  fi
}

expect_status 401 "$ULNAR_SITE_ADDRESS/"
expect_status 401 "$ULNAR_SITE_ADDRESS/assets/main.js"
expect_status 401 --user fixture:invalid "$ULNAR_SITE_ADDRESS/index.html"
expect_status 200 --user "fixture:$password" "$ULNAR_SITE_ADDRESS/assets/main.js"
grep -Fxq 'fixture-static-asset' "$work/body"
grep -Eiq '^cache-control: private, no-store' "$work/headers"
grep -Eiq '^content-security-policy: .*frame-ancestors' "$work/headers"
expect_status 404 --user "fixture:$password" "$ULNAR_SITE_ADDRESS/undertest.xlsx"
expect_status 404 --user "fixture:$password" "$ULNAR_SITE_ADDRESS/assets/"
expect_status 405 --user "fixture:$password" --request POST "$ULNAR_SITE_ADDRESS/"

select_release() {
  ln -s -- "releases/$1" "$work/pending"
  mv -Tf -- "$work/pending" "$ULNAR_RELEASE_ROOT"
  expect_status 200 --user "fixture:$password" "$ULNAR_SITE_ADDRESS/"
  grep -Fxq "fixture-release-$1" "$work/body"
  expect_status 401 "$ULNAR_SITE_ADDRESS/"
}

select_release v2
select_release v1

printf 'replacement %s\n' "$hash" > "$ULNAR_AUTH_FILE"
"$caddy_bin" reload --config "$work/Caddyfile" --adapter caddyfile --address "unix/$work/admin.sock"
expect_status 401 --user "fixture:$password" "$ULNAR_SITE_ADDRESS/"
expect_status 200 --user "replacement:$password" "$ULNAR_SITE_ADDRESS/"
grep -Fxq 'fixture-release-v1' "$work/body"

echo 'Authentification HTTPS, révocation, ressources statiques, promotion et retour arrière validés sur données fictives.'
