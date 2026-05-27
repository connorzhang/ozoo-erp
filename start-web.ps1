$nodeDir = "node-v20.11.1-win-x64"
$env:PATH = "$PSScriptRoot\$nodeDir;" + $env:PATH
cd web
npm install --registry=https://registry.npmmirror.com
npm run dev
