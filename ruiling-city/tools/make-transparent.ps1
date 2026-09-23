Add-Type -AssemblyName System.Drawing

$sourceDir = 'C:\Users\Daniyar\Desktop\images'
$outputDir = Join-Path $PSScriptRoot '..\images'
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$files = @(
    @{ Source = 'almaty_color.png'; Output = 'almaty.png' },
    @{ Source = 'baikonur_color.png'; Output = 'baikonur.png' },
    @{ Source = 'esil_color.png'; Output = 'esil.png' },
    @{ Source = 'nura_color.png'; Output = 'nura.png' },
    @{ Source = 'Saryarka.png'; Output = 'saryarka.png' }
)

function Test-BackgroundPixel([System.Drawing.Color]$color) {
    return $color.R -ge 238 -and $color.G -ge 238 -and $color.B -ge 238
}

foreach ($file in $files) {
    $sourcePath = Join-Path $sourceDir $file.Source
    $outputPath = Join-Path $outputDir $file.Output
    $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
    $result = New-Object System.Drawing.Bitmap($source.Width, $source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = [System.Drawing.Graphics]::FromImage($result)
    $graphics.DrawImageUnscaled($source, 0, 0)
    $graphics.Dispose()

    $visited = New-Object 'bool[,]' $source.Width, $source.Height
    $queue = New-Object 'System.Collections.Generic.Queue[System.Drawing.Point]'

    for ($x = 0; $x -lt $source.Width; $x++) {
        $queue.Enqueue([System.Drawing.Point]::new($x, 0))
        $queue.Enqueue([System.Drawing.Point]::new($x, $source.Height - 1))
    }
    for ($y = 0; $y -lt $source.Height; $y++) {
        $queue.Enqueue([System.Drawing.Point]::new(0, $y))
        $queue.Enqueue([System.Drawing.Point]::new($source.Width - 1, $y))
    }

    while ($queue.Count -gt 0) {
        $point = $queue.Dequeue()
        $x = $point.X
        $y = $point.Y
        if ($x -lt 0 -or $x -ge $source.Width -or $y -lt 0 -or $y -ge $source.Height -or $visited[$x, $y]) { continue }
        $visited[$x, $y] = $true
        $pixel = $source.GetPixel($x, $y)
        if (-not (Test-BackgroundPixel $pixel)) { continue }

        $result.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, $pixel.R, $pixel.G, $pixel.B))
        $queue.Enqueue([System.Drawing.Point]::new($x + 1, $y))
        $queue.Enqueue([System.Drawing.Point]::new($x - 1, $y))
        $queue.Enqueue([System.Drawing.Point]::new($x, $y + 1))
        $queue.Enqueue([System.Drawing.Point]::new($x, $y - 1))
    }

    $result.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $result.Dispose()
    $source.Dispose()
    Write-Output $outputPath
}
