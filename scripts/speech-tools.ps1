$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
. (Join-Path $PSScriptRoot 'build-directory.ps1')
$speech = Join-Path $root '.work/speech'
New-Item -ItemType Directory -Path $speech -Force | Out-Null
function Fetch($label,$name,$url,$sha) {
  $path = Join-Path $cache $name
  if (!(Test-Path $path) -or (Get-FileHash $path).Hash -ne $sha) {
    Write-Host "Downloading $label..."
    curl.exe -fL --progress-bar --retry 3 -o $path $url
    if ($LASTEXITCODE -ne 0 -or (Get-FileHash $path).Hash -ne $sha) { throw "Download failed verification: $name" }
  }
  return $path
}
Invoke-InBuildDirectory {
  param($cache)
  $kit = Fetch 'English voices' 'kokoro-en-v0_19.tar.bz2' 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-en-v0_19.tar.bz2' '912804855a04745fa77a30be545b3f9a5d15c4d66db00b88cbcd4921df605ac7'
  $engine = Fetch 'the voice player' 'sherpa-1.13.8.tar.bz2' 'https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.8/sherpa-onnx-v1.13.8-win-x64-shared-MD-MinSizeRel.tar.bz2' '416011eabb9a1e26fd4433b41871d67c7a00b1f0a11b75fe66ff8182b8224f95'
  $asr = Fetch 'the speech recognizer' 'whisper.zip' 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.7.6/whisper-bin-x64.zip' '0d2eca299c248f965bd0341bcb219db4b433c7f0c0ce2200d4df85765e8156a9'
  $model = Fetch 'English transcription data' 'ggml-base.en-q5_1.bin' 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.en-q5_1.bin' '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f'
  Copy-Item -LiteralPath $model -Destination $speech -Force
  foreach ($archive in @($kit,$engine,$asr)) { tar.exe -xf $archive -C $cache; if ($LASTEXITCODE) { throw "Cannot unpack $archive" } }
  Copy-Item -LiteralPath (Join-Path $cache 'kokoro-en-v0_19') -Destination $speech -Recurse -Force
  foreach ($pair in @(@('sherpa-onnx-offline-tts.exe','tts'),@('whisper-cli.exe','asr'))) {
    $source = if ($pair[1] -eq 'tts') { Join-Path $cache 'sherpa-onnx-v1.13.8-win-x64-shared-MD-MinSizeRel' } else { Join-Path $cache 'Release' }
    $exe = Get-ChildItem -Path $source -Recurse -Filter $pair[0] | Select-Object -First 1
    if (!$exe) { throw "Missing $($pair[0])" }
    $dir = Join-Path $speech $pair[1]
    New-Item -ItemType Directory -Force $dir | Out-Null
    Copy-Item -LiteralPath $exe.FullName -Destination $dir -Force
    Get-ChildItem -Path $exe.DirectoryName -Filter '*.dll' | Copy-Item -Destination $dir -Force
  }
}
Write-Output "Offline speech engines are ready in $speech."

