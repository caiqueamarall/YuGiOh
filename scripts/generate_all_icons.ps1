Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\Caique Amaral\.gemini\antigravity-ide\brain\1e7fb2e3-2cde-4180-b3de-7335cef49f67\.user_uploaded\media_1791899918705.png"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found: $sourcePath"
    exit 1
}

$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)
$darkBg = [System.Drawing.Color]::FromArgb(255, 18, 18, 20) # #121214

# 1. Helper to render icon with solid background and centered emblem
function Create-Solid-Icon($img, [int]$size, [double]$contentRatio, [string]$destPath) {
    $parent = Split-Path -Parent $destPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear($darkBg)

    $innerSize = [int]($size * $contentRatio)
    $offset = [int](($size - $innerSize) / 2)
    $g.DrawImage($img, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()

    if (Test-Path $destPath) {
        Remove-Item -Force $destPath
    }
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Created Solid Icon: $destPath ($size x $size, ratio: $contentRatio)"
}

# 2. Helper to render adaptive foreground (transparent background, centered emblem)
function Create-Adaptive-Foreground($img, [int]$size, [double]$contentRatio, [string]$destPath) {
    $parent = Split-Path -Parent $destPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $innerSize = [int]($size * $contentRatio)
    $offset = [int](($size - $innerSize) / 2)
    $g.DrawImage($img, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()

    if (Test-Path $destPath) {
        Remove-Item -Force $destPath
    }
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Created Adaptive Foreground: $destPath ($size x $size, ratio: $contentRatio)"
}

# Apple Touch Icon: 180x180, solid #121214, ~76% content ratio (safe margin so iOS squircle mask doesn't clip)
Create-Solid-Icon $sourceImg 180 0.78 "d:\Projetos\YuGiOh\public\apple-touch-icon.png"
Create-Solid-Icon $sourceImg 180 0.78 "d:\Projetos\YuGiOh\public\apple-touch-icon-precomposed.png"
Create-Solid-Icon $sourceImg 180 0.78 "d:\Projetos\YuGiOh\public\apple-touch-icon-180x180.png"
Create-Solid-Icon $sourceImg 180 0.78 "d:\Projetos\YuGiOh\public\apple-touch-icon-180x180-precomposed.png"
Create-Solid-Icon $sourceImg 180 0.78 "d:\Projetos\YuGiOh\apple-touch-icon.png"

# Web App Icons (PWA & Favicon)
Create-Solid-Icon $sourceImg 512 0.80 "d:\Projetos\YuGiOh\public\icon.png"
Create-Solid-Icon $sourceImg 512 0.80 "d:\Projetos\YuGiOh\public\icon-512.png"
Create-Solid-Icon $sourceImg 192 0.80 "d:\Projetos\YuGiOh\public\icon-192.png"
Create-Solid-Icon $sourceImg 512 0.80 "d:\Projetos\YuGiOh\src\assets\edison-logo.png"

# Android Mipmap Folders
$resDir = "d:\Projetos\YuGiOh\android\app\src\main\res"
$configs = @(
    @{ Folder = "mipmap-mdpi"; Size = 48; ForeSize = 108 },
    @{ Folder = "mipmap-hdpi"; Size = 72; ForeSize = 162 },
    @{ Folder = "mipmap-xhdpi"; Size = 96; ForeSize = 216 },
    @{ Folder = "mipmap-xxhdpi"; Size = 144; ForeSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; Size = 192; ForeSize = 432 }
)

foreach ($cfg in $configs) {
    $folder = Join-Path $resDir $cfg.Folder
    # Legacy launchers icon (solid dark background + centered golden emblem)
    Create-Solid-Icon $sourceImg $cfg.Size 0.82 (Join-Path $folder "ic_launcher.png")
    Create-Solid-Icon $sourceImg $cfg.Size 0.82 (Join-Path $folder "ic_launcher_round.png")
    # Adaptive icon foreground (centered 72% inner size on transparent)
    Create-Adaptive-Foreground $sourceImg $cfg.ForeSize 0.72 (Join-Path $folder "ic_launcher_foreground.png")
}

$sourceImg.Dispose()
Write-Host "All icons generated successfully!"
