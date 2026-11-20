#!/bin/sh
# 把 src/ 的分段檔合併成 app.js
cd "$(dirname "$0")"
cat src/0*.js > app.js
