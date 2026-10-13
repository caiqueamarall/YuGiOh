Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\Caique Amaral\.gemini\antigravity-ide\brain\1e7fb2e3-2cde-4180-b3de-7335cef49f67\.user_uploaded\media_1791899918705.png"

if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found: $sourcePath"
    exit 1
}

$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-And-Save($img, [int]$width, [int]$height, [string]$destPath) {
    $parent = Split-Path -Parent $destPath
    if (-not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }

    $destBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($img, 0, 0, $width, $height)
    $g.Dispose()

    if (Test-Path $destPath) {
        Remove-Item -Force $destPath
    }
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated: $destPath ($width x $height)"
}

function Create-Adaptive-Foreground($img, [int]$size, [string]$destPath) {
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

    # 72% inner content size centered
    $innerSize = [int]($size * 0.72)
    $offset = [int](($size - $innerSize) / 2)
    $g.DrawImage($img, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()

    if (Test-Path $destPath) {
        Remove-Item -Force $destPath
    }
    $destBmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Generated Adaptive: $destPath ($size x $size)"
}

# 1. Web Assets
Resize-And-Save $sourceImg 512 512 "d:\Projetos\YuGiOh\public\icon.png"
Resize-And-Save $sourceImg 512 512 "d:\Projetos\YuGiOh\public\icon-512.png"
Resize-And-Save $sourceImg 192 192 "d:\Projetos\YuGiOh\public\icon-192.png"
Resize-And-Save $sourceImg 180 180 "d:\Projetos\YuGiOh\public\apple-touch-icon.png"
Resize-And-Save $sourceImg 512 512 "d:\Projetos\YuGiOh\src\assets\edison-logo.png"

# 2. Android Mipmaps
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
    Resize-And-Save $sourceImg $cfg.Size $cfg.Size (Join-Path $folder "ic_launcher.png")
    Resize-And-Save $sourceImg $cfg.Size $cfg.Size (Join-Path $folder "ic_launcher_round.png")
    Create-Adaptive-Foreground $sourceImg $cfg.ForeSize (Join-Path $folder "ic_launcher_foreground.png")
}

$sourceImg.Dispose()
Write-Host "All icons generated successfully!"
