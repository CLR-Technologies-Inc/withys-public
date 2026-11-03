#!/bin/sh
# Install the upstream launcher and metadata alongside an already installed binary.
set -eu
cd "$(dirname "$0")"
app_id=co.clrtechnologies.Meadows
datadir="${DESTDIR:-}${PREFIX:-/usr/local}/share"
install -Dm644 "$app_id.desktop" "$datadir/applications/$app_id.desktop"
install -Dm644 "$app_id.metainfo.xml" "$datadir/metainfo/$app_id.metainfo.xml"
install -Dm644 ../../public/brand/app-icon-512.svg "$datadir/icons/hicolor/scalable/apps/$app_id.svg"
install -Dm644 icon.png "$datadir/icons/hicolor/512x512/apps/$app_id.png"
