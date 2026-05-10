Remove-Item -Recurse -Force .\node_modules -ErrorAction SilentlyContinue
Remove-Item -Force .\package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
npm cache verify
npm install --legacy-peer-deps --no-audit --no-fund --progress=false
