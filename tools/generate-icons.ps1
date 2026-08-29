param(
  [string]$OutputDir = (Join-Path $PSScriptRoot '..\public\icons')
)

Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

$orange = [System.Drawing.ColorTranslator]::FromHtml('#ff6b00')
$orangeDark = [System.Drawing.ColorTranslator]::FromHtml('#d94e00')
$white = [System.Drawing.Color]::White

foreach ($size in 16, 48, 128) {
  $bitmap = [System.Drawing.Bitmap]::new($size, $size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $background = [System.Drawing.SolidBrush]::new($orange)
  $bolt = [System.Drawing.SolidBrush]::new($white)
  $border = [System.Drawing.Pen]::new($orangeDark, [Math]::Max(1, [Math]::Round($size * 0.04)))

  try {
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.Clear([System.Drawing.Color]::Transparent)
    $inset = [Math]::Round($size * 0.04)
    $diameter = $size - (2 * $inset)
    $graphics.FillEllipse($background, $inset, $inset, $diameter, $diameter)
    $graphics.DrawEllipse($border, $inset, $inset, $diameter, $diameter)

    $points = [System.Drawing.PointF[]]@(
      [System.Drawing.PointF]::new($size * 0.58, $size * 0.14),
      [System.Drawing.PointF]::new($size * 0.28, $size * 0.56),
      [System.Drawing.PointF]::new($size * 0.48, $size * 0.56),
      [System.Drawing.PointF]::new($size * 0.42, $size * 0.86),
      [System.Drawing.PointF]::new($size * 0.74, $size * 0.42),
      [System.Drawing.PointF]::new($size * 0.55, $size * 0.42)
    )
    $graphics.FillPolygon($bolt, $points)
    $bitmap.Save((Join-Path $OutputDir "icon$size.png"), [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $border.Dispose()
    $bolt.Dispose()
    $background.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}
